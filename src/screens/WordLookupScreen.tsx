import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';
import ConfirmDialog from '../components/ConfirmDialog';
import LanguageSelect from '../components/LanguageSelect';
import { Text, TextInput } from '../components/Text';
import { WebView } from '../components/WebView';
import { getWiktionaryDefinitions, getWiktionaryLanguage, hasWiktionaryEntry, type WiktionaryDefinition } from '../utils/wiktionary';
import { useWiktionaryPronunciation } from '../hooks/useWiktionaryPronunciation';
import { findPartOfSpeech } from '../utils/partOfSpeech';
import WordTransformButtons from '../components/WordTransformButtons';
import MasteryLevelSelector from '../components/MasteryLevelSelector';
import PronunciationAudio from '../components/PronunciationAudio';
import WordSenseList, { type WordSenseData } from '../components/WordSenseList';
import { Colors } from '../constants/theme';
import { isSameLanguage } from '../constants/languages';
import { useStore } from '../store/useStore';
import { MasteryLevel, RootTabParamList, WordContext } from '../types';
import { pickDefinition } from '../utils/definitionHighlight';
import { getGermanExpandedForm } from '../utils/wordTransform';
import { emojiData } from '../utils/emojiData';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import { getScrapeIpaJS } from '../utils/scrapeIpaJS';

type WordLookupRouteProp = RouteProp<RootTabParamList, 'WordLookup'>;

const wiktionaryPageUrl = (word: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
// The id of a language's heading on a Wiktionary page, e.g. "Serbo-Croatian" for Croatian
const wiktionarySectionId = (language: string) => getWiktionaryLanguage(language).replace(/ /g, '_');

export default function WordLookupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<WordLookupRouteProp>();
  const isFocused = useIsFocused();
  const { word, wordId, songId, songName, artistName, lyricsLine, translationLine, originalLanguages, source, occurrence: routeOccurrence, ipa: routeIpa } = route.params || {};
  const insets = useSafeAreaInsets();

  const words = useStore((s) => s.words);
  const addOrUpdateWord = useStore((s) => s.addOrUpdateWord);
  const deleteWord = useStore((s) => s.deleteWord);
  const webViewRef = useRef<WebView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [canGoBackInWebView, setCanGoBackInWebView] = useState(false);
  const [scrollViewAtBottom, setScrollViewAtBottom] = useState(false);
  // Outer ScrollView offset and max offset, for scrolling it from WebView drags
  const outerScrollRef = useRef({ y: 0, maxY: 0 });

  // On Android, a WebView with nestedScrollEnabled keeps every drag that starts on it, and without it never
  // scrolls. So the page owns drags only once the screen is scrolled to the bottom, and the injected script
  // hands a drag back to the screen while the page sits at its top (or the screen has left the bottom).
  // Deciding per touchmove inside the page lets one drag move between the two without getting stuck.
  const injectedJavaScript = `
    (function() {
      if (window.__lyricsionaryScroll) return;
      window.__lyricsionaryScroll = true;
      if (window.__outerAtBottom === undefined) window.__outerAtBottom = false;
      var lastY = null;
      window.addEventListener('touchstart', function(e) {
        lastY = e.touches.length === 1 ? e.touches[0].clientY : null;
      }, { passive: true });
      window.addEventListener('touchmove', function(e) {
        if (lastY === null || e.touches.length !== 1) return;
        var y = e.touches[0].clientY;
        var dy = y - lastY;
        lastY = y;
        if (dy === 0) return;
        var pageAtTop = (window.scrollY || window.pageYOffset || 0) <= 0;
        // dy > 0: finger moving down, i.e. scrolling up
        if ((pageAtTop && dy > 0) || !window.__outerAtBottom) {
          if (e.cancelable) e.preventDefault();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'outerScroll', dy: dy }));
        }
      }, { passive: false });
      window.addEventListener('touchend', function() { lastY = null; }, { passive: true });
      window.addEventListener('touchcancel', function() { lastY = null; }, { passive: true });
    })();
    true;
  `;

  const syncOuterAtBottom = (atBottom: boolean) => {
    webViewRef.current?.injectJavaScript(`window.__outerAtBottom = ${atBottom}; true;`);
  };

  useEffect(() => {
    syncOuterAtBottom(scrollViewAtBottom);
  }, [scrollViewAtBottom]);

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'outerScroll') {
        const { y, maxY } = outerScrollRef.current;
        const nextY = Math.max(0, Math.min(maxY, y - data.dy));
        outerScrollRef.current.y = nextY;
        scrollViewRef.current?.scrollTo({ y: nextY, animated: false });
      } else if (data.type === 'ipa' && data.results) {
        setScrapedIpaResults(data.results);
        // Fill in an empty pronunciation with the page's first IPA
        const firstIpa = (data.results as string[]).find(Boolean);
        if (firstIpa) {
          setPronunciation((current) => current || firstIpa);
        }
      } else if (data.type === 'ipaError') {
        console.log('IPA scraping error:', data.message);
      }
    } catch {}
  };

  const handleOuterScroll = (event: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    outerScrollRef.current = { y: contentOffset.y, maxY: Math.max(0, contentSize.height - layoutMeasurement.height) };
    setScrollViewAtBottom(layoutMeasurement.height + contentOffset.y >= contentSize.height - 20);
  };

  const [currentUrl, setCurrentUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupSource, setLookupSource] = useState<'google' | 'wiktionary'>('wiktionary');

  // A saved word opened from Words has no song languages: start with its own language, so the
  // Wiktionary page opens at that section rather than English's
  const [language, setLanguage] = useState(
    () =>
      (wordId ? words.find((entry) => entry.id === wordId)?.language : undefined) ??
      ((originalLanguages && originalLanguages.length > 0) ? originalLanguages[0] : 'English')
  );
  // The current language for the page opened once the entry check finishes
  const languageRef = useRef(language);
  languageRef.current = language;
  const [pronunciation, setPronunciation] = useState('');
  const [masteryLevel, setMasteryLevel] = useState<MasteryLevel>('New');
  const [scrapedIpaResults, setScrapedIpaResults] = useState<string[]>([]);
  const [definitionSuggestions, setDefinitionSuggestions] = useState<WiktionaryDefinition[]>([]);

  const uidRef = useRef(0);
  const mkUid = () => ++uidRef.current;

  const [wordSenses, setWordSenses] = useState<WordSenseData[]>([
    { uid: mkUid(), context: lyricsLine || '', emoji: '', ipa: '', definition: '', songId, songName, occurrence: routeOccurrence || 1 }
  ]);
  const [emojiPickerIndex, setEmojiPickerIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [undoData, setUndoData] = useState<{ block: WordSenseData; index: number } | null>(null);

  const [displayWord, setDisplayWord] = useState(word);
  // The Look Up card's IPA for this word, used instead of scraping the Wiktionary page
  const cardIpa = routeIpa && routeIpa.length > 0 && displayWord === word ? routeIpa : undefined;
  // Page the Wiktionary tab shows instead of displayWord when it has no entry (e.g. "hab'n" -> "haben")
  const [wiktionaryRedirect, setWiktionaryRedirect] = useState<{ from: string; to: string } | null>(null);
  const wiktionaryWord = wiktionaryRedirect && wiktionaryRedirect.from === displayWord ? wiktionaryRedirect.to : displayWord;

  const findExistingWord = () => words.find((entry) =>
    wordId
      ? entry.id === wordId
      : entry.word.toLowerCase() === displayWord?.toLowerCase() && isSameLanguage(entry.language, language)
  );

  useEffect(() => {
    setDisplayWord(word);
  }, [word]);

  // Drop the previous word's IPA right away, not once its page has been replaced
  useEffect(() => {
    setScrapedIpaResults([]);
  }, [displayWord]);

  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [word]);

  // The word (and where it was looked up from) that the form was last filled in for
  const filledLookupRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (displayWord) {
      const lookup = [wordId, displayWord, songId, lyricsLine, routeOccurrence, source].join('\u0000');
      const isNewLookup = filledLookupRef.current !== lookup;
      filledLookupRef.current = lookup;
      const existingWord = findExistingWord();
      // Picking another language for the same word keeps it and what's been typed, unless the word
      // is saved in that language, whose details then fill in
      if (!isNewLookup && (wordId || !existingWord)) return;
      if (existingWord) {
        setLanguage(existingWord.language);
        setPronunciation(existingWord.pronunciation || cardIpa?.[0] || '');
        setMasteryLevel(existingWord.masteryLevel || 'New');

        if (existingWord.contexts && existingWord.contexts.length > 0) {
          const exactMatchIndex = existingWord.contexts.findIndex(c =>
            c.songId === songId && c.context === lyricsLine && (c.occurrence || 1) === (routeOccurrence || 1)
          );
          const hasNewContextFromLearn = source === 'Learn' && lyricsLine && exactMatchIndex < 0;

          const mapContext = (c: WordContext): WordSenseData => ({
            uid: mkUid(),
            context: c.context,
            emoji: c.emoji || '',
            ipa: c.ipa || '',
            definition: c.definition || '',
            songId: c.songId,
            songName: c.songName,
            occurrence: c.occurrence || 1,
            fromSong: c.fromSong ?? false,
            translation: c.translation,
            partOfSpeech: c.partOfSpeech,
          });

          if (exactMatchIndex >= 0) {
            const first = mapContext(existingWord.contexts[exactMatchIndex]);
            const rest = existingWord.contexts.filter((_, i) => i !== exactMatchIndex).map(mapContext);
            setWordSenses([first, ...rest]);
          } else if (hasNewContextFromLearn) {
            const newBlock: WordSenseData = {
              uid: mkUid(),
              context: lyricsLine,
              emoji: '',
              ipa: '',
              definition: '',
              songId,
              songName,
              translation: translationLine,
              fromSong: true,
              occurrence: routeOccurrence || 1,
              isNew: true,
            };
            const existingBlocks = existingWord.contexts.map(mapContext);
            setWordSenses([...existingBlocks, newBlock]);
          } else {
            const existingBlocks = existingWord.contexts.map(mapContext);
            setWordSenses(existingBlocks);
          }
        } else {
          setWordSenses([{ uid: mkUid(), context: lyricsLine || '', emoji: '', ipa: '', definition: '', songId, songName, translation: translationLine, fromSong: !!(source === 'Learn' && lyricsLine), occurrence: routeOccurrence || 1, isNew: true }]);
        }
      } else {
        setPronunciation(cardIpa?.[0] ?? '');
        setMasteryLevel('New');
        setWordSenses([{ uid: mkUid(), context: lyricsLine || '', emoji: '', ipa: '', definition: '', songId, songName, translation: translationLine, fromSong: !!(source === 'Learn' && lyricsLine), occurrence: routeOccurrence || 1, isNew: true }]);
        if (originalLanguages && originalLanguages.length > 0) {
          setLanguage(originalLanguages[0]);
        } else {
          setLanguage('English');
        }
      }
    }
  }, [displayWord, wordId, language, words, songId, lyricsLine, originalLanguages, routeOccurrence, source, cardIpa]);

  const isNewWord = displayWord && !findExistingWord();

  const hasChanges = useMemo(() => {
    if (!displayWord) return false;
    if (isNewWord) return true;
    const existing = findExistingWord();
    if (!existing) return true;
    if (language !== existing.language) return true;
    if (pronunciation !== existing.pronunciation) return true;
    if (masteryLevel !== (existing.masteryLevel || 'New')) return true;
    const normalizeSense = (s: any) => `${s.context || ''}|${s.emoji || ''}|${s.ipa || ''}|${s.definition || ''}|${s.songId || ''}|${s.occurrence || 1}|${s.partOfSpeech || ''}`;
    const currentNormalized = wordSenses
      .filter(b => b.context || b.emoji || b.ipa || b.definition)
      .map(normalizeSense)
      .sort()
      .join('||');
    const storedNormalized = (existing.contexts || [])
      .map(normalizeSense)
      .sort()
      .join('||');
    return currentNormalized !== storedNormalized;
  }, [displayWord, isNewWord, language, pronunciation, masteryLevel, wordSenses, words]);

  // Suggest the word's Wiktionary definitions in the selected language for each context's definition
  useEffect(() => {
    setDefinitionSuggestions([]);
    if (!wiktionaryWord || !language) return;
    let cancelled = false;
    getWiktionaryDefinitions(wiktionaryWord, language).then((definitions) => {
      if (!cancelled && definitions) setDefinitionSuggestions(definitions);
    });
    return () => {
      cancelled = true;
    };
  }, [wiktionaryWord, language]);

  // Fill in empty definitions with the only suggestion, or the one that matches the line's translation
  useEffect(() => {
    if (definitionSuggestions.length === 0) return;
    setWordSenses((prev) => {
      let changed = false;
      const next = prev.map((sense) => {
        if (sense.definition) return sense;
        const picked = pickDefinition(definitionSuggestions, sense.translation);
        if (!picked) return sense;
        changed = true;
        return { ...sense, definition: picked };
      });
      return changed ? next : prev;
    });
  }, [definitionSuggestions]);

  const savedWord = findExistingWord();
  const wiktionaryPronunciation = useWiktionaryPronunciation(wiktionaryWord, language, {
    // The saved recordings are for the saved word's language
    savedAudio: savedWord && isSameLanguage(savedWord.language, language) ? savedWord.audio : undefined,
    // The Wiktionary tab reads the IPA itself
    needsIpa: false,
  });
  const pronunciationAudio = wiktionaryPronunciation.audio;

  const entryCheckedWordRef = useRef<string | undefined>(undefined);

  // Choosing another language scrolls the open Wiktionary page to that language's section
  useEffect(() => {
    if (!wiktionaryWord) return;
    const pageUrl = wiktionaryPageUrl(wiktionaryWord);
    setCurrentUrl((url) => (url.split('#')[0] === pageUrl ? `${pageUrl}#${wiktionarySectionId(language)}` : url));
  }, [language]);

  useEffect(() => {
    if (!displayWord) return;
    let cancelled = false;

    const open = (source: 'google' | 'wiktionary') => {
      const url = source === 'google'
        ? `https://www.google.com/search?igu=1&q=define+${encodeURIComponent(displayWord)}`
        : `${wiktionaryPageUrl(wiktionaryWord!)}#${wiktionarySectionId(languageRef.current)}`;
      setCurrentUrl(url);
      setScrapedIpaResults([]);
    };

    // Start each new word on Wiktionary when it has an entry, otherwise on Google; tapping a tab still switches
    if (entryCheckedWordRef.current !== displayWord) {
      entryCheckedWordRef.current = displayWord;
      setLoading(true);
      const lowercase = displayWord.toLowerCase();
      hasWiktionaryEntry(displayWord).then(async (exists) => {
        // A capitalized word (e.g. first in a line) whose page only exists in lowercase becomes the lowercase word
        if (exists === false && lowercase !== displayWord && (await hasWiktionaryEntry(lowercase))) {
          if (!cancelled) setDisplayWord(lowercase);
          return;
        }
        // A shortened word without its own page (e.g. "hab'n") shows its full form's page (e.g. "haben")
        if (exists === false) {
          const expanded = getGermanExpandedForm(displayWord, languageRef.current);
          const candidates = expanded ? [...new Set([expanded.toLowerCase(), expanded])] : [];
          for (const candidate of candidates) {
            if (await hasWiktionaryEntry(candidate)) {
              if (!cancelled) {
                setWiktionaryRedirect({ from: displayWord, to: candidate });
                setLookupSource('wiktionary');
              }
              return;
            }
          }
        }
        if (cancelled) return;
        const source = exists === false ? 'google' : 'wiktionary';
        if (source === lookupSource) {
          open(source);
        } else {
          setLookupSource(source);
        }
      });
    } else {
      open(lookupSource);
    }

    return () => {
      cancelled = true;
    };
  }, [displayWord, wiktionaryWord, lookupSource]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isFocused) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackInWebView && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }

      if (source === 'Words') {
        navigation.navigate('Words');
      } else if (source === 'Learn' && songId) {
        navigation.navigate('Learn', { songId });
      } else {
        navigation.goBack();
      }
      return true;
    });

    return () => {
      backHandler.remove();
    };
  }, [canGoBackInWebView, isFocused, navigation, source, songId]);

  const updateWordSense = (index: number, field: keyof WordSenseData, value: string | number) => {
    setUndoData(null);
    // Another definition can be another type of word, found again when saving
    setWordSenses(prev => prev.map((b, i) => i !== index ? b
      : field === 'definition' && value !== b.definition ? { ...b, definition: String(value), partOfSpeech: undefined }
      : { ...b, [field]: value }));
  };

  const addWordSense = () => {
    setUndoData(null);
    setWordSenses(prev => [...prev, { uid: mkUid(), context: '', emoji: '', ipa: '', definition: '', songId, songName, occurrence: 1, isNew: true }]);
  };

  const removeWordSense = (index: number) => {
    setUndoData({ block: wordSenses[index], index });
    setWordSenses(prev => prev.filter((_, i) => i !== index));
  };

  const undoRemoveWordSense = () => {
    if (undoData) {
      setWordSenses(prev => {
        const newBlocks = [...prev];
        newBlocks.splice(undoData.index, 0, undoData.block);
        return newBlocks;
      });
      setUndoData(null);
    }
  };

  const handleSave = async () => {
    if (!displayWord) return;

    const contexts: WordContext[] = wordSenses
      .filter(b => b.context || b.emoji || b.ipa || b.definition)
      .map(b => ({
        context: b.context,
        emoji: b.emoji || undefined,
        ipa: b.ipa || undefined,
        definition: b.definition || undefined,
        songId: b.songId,
        songName: b.songName,
        fromSong: b.fromSong ?? false,
        occurrence: b.occurrence || 1,
        translation: b.translation || undefined,
        partOfSpeech: b.definition
          ? b.partOfSpeech ?? findPartOfSpeech(b.definition, definitionSuggestions)
          : undefined,
      }));

    await addOrUpdateWord(
      displayWord, language, pronunciation, contexts, masteryLevel,
      wiktionaryPronunciation.loaded ? pronunciationAudio : undefined
    );

    if (source === 'Words') {
      navigation.navigate('Words');
    } else if (source === 'Learn' && songId) {
      navigation.navigate('Learn', { songId });
    } else {
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    if (source === 'Words') {
      navigation.navigate('Words');
    } else if (source === 'Learn' && songId) {
      navigation.navigate('Learn', { songId });
    } else {
      navigation.goBack();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const existing = findExistingWord();
    if (existing) {
      await deleteWord(existing.id);
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    handleCancel();
  };

  const switchToGoogle = () => {
    setLookupSource('google');
  };

  const switchToWiktionary = () => {
    setLookupSource('wiktionary');
  };

  const handleWebViewGoBack = () => {
    if (canGoBackInWebView && webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  const ipaOptions = cardIpa ?? (lookupSource === 'wiktionary' ? scrapedIpaResults : []);

  const ipaPlaceholder = pronunciation
    ? (pronunciation.includes('/') ? pronunciation : `/${pronunciation}/`)
    : 'e.g., /prəˌnʌnsiˈeɪʃən/';

  const existingWord = words.find(w => w.word.toLowerCase() === displayWord?.toLowerCase());

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayWord}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, isNewWord && { backgroundColor: Colors.success }, !hasChanges && !isNewWord && styles.saveButtonDisabled]}
          disabled={!hasChanges && !isNewWord}
        >
          <Text style={[styles.saveButtonText, !hasChanges && !isNewWord && styles.saveButtonTextDisabled]}>{isNewWord ? 'Add' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        onScroll={handleOuterScroll}
        scrollEventThrottle={20}
      >
        {word && (
          <View style={styles.wordTransformButtons}>
            <WordTransformButtons
              word={word}
              language={language}
              songId={songId}
              songName={songName}
              artistName={artistName}
              lyricsLine={lyricsLine}
              translationLine={translationLine}
              originalLanguages={originalLanguages}
              source={source}
              occurrence={routeOccurrence}
              hideOriginalWord
            />
          </View>
        )}

        <View style={styles.fieldSection}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Language</Text>
            <LanguageSelect
              value={language}
              onValueChange={setLanguage}
              placeholder="Select language"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pronunciation</Text>
            <TextInput
              style={styles.fieldInput}
              value={pronunciation}
              onChangeText={setPronunciation}
              placeholder="e.g., /prəˌnʌnsiˈeɪʃən/"
              placeholderTextColor={Colors.textMuted}
            />
            <PronunciationAudio audio={pronunciationAudio} />
            {ipaOptions.length > 0 && (
              <View style={styles.ipaResultsRow}>
                {ipaOptions.filter(ipa => ipa && !pronunciation.includes(ipa)).map((ipa, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.ipaResultButton}
                    onPress={() => setPronunciation(ipa)}
                  >
                    <Text style={styles.ipaResultButtonText}>{ipa}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Level</Text>
            <MasteryLevelSelector value={masteryLevel} onChange={setMasteryLevel} />
          </View>

          <Text style={styles.fieldLabel}>Contexts</Text>
          <WordSenseList
            wordSenses={wordSenses}
            undoData={undoData}
            displayWord={displayWord}
            songName={songName}
            artistName={artistName}
            ipaPlaceholder={ipaPlaceholder}
            isNewWord={!!isNewWord}
            definitionSuggestions={definitionSuggestions}
            onUpdateWordSense={updateWordSense}
            onEmojiPress={setEmojiPickerIndex}
            onRemoveWordSense={removeWordSense}
            onUndoRemove={undoRemoveWordSense}
          />

          <TouchableOpacity style={styles.addContextButton} onPress={addWordSense}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.addContextButtonText}>Add context</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sourceSelector}>
          <TouchableOpacity
            style={[styles.sourceButton, lookupSource === 'wiktionary' && styles.sourceButtonActive]}
            onPress={switchToWiktionary}
          >
            <Ionicons
              name="book-outline"
              size={18}
              color={lookupSource === 'wiktionary' ? Colors.white : Colors.text}
            />
            <Text style={[
              styles.sourceButtonText,
              lookupSource === 'wiktionary' && styles.sourceButtonTextActive
            ]}>
              Wiktionary
            </Text>
          </TouchableOpacity>

        <TouchableOpacity
            style={[styles.sourceButton, lookupSource === 'google' && styles.sourceButtonActive]}
            onPress={switchToGoogle}
          >
            <Ionicons
              name="logo-google"
              size={18}
              color={lookupSource === 'google' ? Colors.white : Colors.text}
            />
            <Text style={[
              styles.sourceButtonText,
              lookupSource === 'google' && styles.sourceButtonTextActive
            ]}>
              Google
            </Text>
          </TouchableOpacity>
        </View>


        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            {canGoBackInWebView && (
              <TouchableOpacity
                onPress={handleWebViewGoBack}
                style={styles.webViewBackButton}
                accessibilityRole="button"
                accessibilityLabel="Previous page"
              >
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {getFaviconUrl(currentUrl) && (
              <Image
                source={{ uri: getFaviconUrl(currentUrl)! }}
                style={styles.favicon}
              />
            )}
            <Text style={styles.webViewTitle} numberOfLines={1}>
              {pageTitle || currentUrl}
            </Text>
          </View>

          <View style={styles.webViewWrapper}>
            {currentUrl ? (
              <WebView
                ref={webViewRef}
                source={{ uri: currentUrl }}
                style={styles.webview}
                onNavigationStateChange={(navState) => {
                  setPageTitle(navState.title ?? '');
                  setCanGoBackInWebView(navState.canGoBack);

                  if (lookupSource === 'wiktionary' && navState.url && webViewRef.current) {
                    const url = navState.url;
                    const isWiktionary = url.includes('wiktionary.org/wiki/');
                    const hasLanguageAnchor = url.includes('#');

                    if (isWiktionary && !hasLanguageAnchor && language) {
                      const newUrl = `${url}#${language}`;
                      setCurrentUrl(newUrl);
                    }
                  }
                }}
                onLoadStart={() => {
                  setLoading(true);
                  setScrapedIpaResults([]);
                }}
                onLoadEnd={() => {
                  setLoading(false);
                  syncOuterAtBottom(scrollViewAtBottom);
                  if (lookupSource === 'wiktionary' && !cardIpa && webViewRef.current) {
                    webViewRef.current.injectJavaScript(getScrapeIpaJS(language));
                  }
                }}
                javaScriptEnabled
                nestedScrollEnabled={scrollViewAtBottom}
                injectedJavaScript={injectedJavaScript}
                onMessage={handleWebViewMessage}
              />
            ) : null}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            )}
          </View>
        </View>

        {existingWord && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteConfirm(true)}>
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            <Text style={styles.deleteButtonText}>Delete word</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <EmojiPicker
        onEmojiSelected={(emojiObject: EmojiType) => {
          if (emojiPickerIndex !== null) {
            updateWordSense(emojiPickerIndex, 'emoji', emojiObject.emoji);
          }
        }}
        open={emojiPickerIndex !== null}
        onClose={() => setEmojiPickerIndex(null)}
        enableSearchBar={true}
        emojisByCategory={emojiData}
        theme={{
          backdrop: 'rgba(0, 0, 0, 0.6)',
          knob: Colors.textMuted,
          container: Colors.surface,
          header: Colors.text,
          skinTonesContainer: Colors.surfaceLight,
          category: {
            icon: Colors.textSecondary,
            iconActive: Colors.primary,
            container: Colors.surface,
            containerActive: Colors.surfaceLight,
          },
          search: {
            background: Colors.surfaceLight,
            text: Colors.text,
            placeholder: Colors.textMuted,
            icon: Colors.textSecondary,
          },
          emoji: {
            selected: Colors.primary,
          },
        }}
      />
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Word"
        message={`Are you sure you want to delete "${displayWord}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive
        loading={isDeleting}
      />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonTextDisabled: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
  },
  contextSection: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contextLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  
  wordTransformButtons: {
    marginLeft: 16,
  },
  fieldSection: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  fieldInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ipaResultsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  ipaResultButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ipaResultButtonText: {
    color: Colors.text,
    fontSize: 14,
  },
  addContextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  addContextButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  deleteButtonText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  sourceSelector: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sourceButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sourceButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sourceButtonTextActive: {
    color: Colors.white,
  },
  webViewContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  webViewBackButton: {
    padding: 4,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  webViewTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  webViewWrapper: {
    height: 525,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
