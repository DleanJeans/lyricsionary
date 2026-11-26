import { setStudyLanguage } from '../services/usageTime';
import { resumeReview } from '../navigation/reviewResume';
import { Ionicons } from '@expo/vector-icons';
import { withAbbreviationNote } from '../utils/abbreviationNote';
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
import * as Clipboard from 'expo-clipboard';
import ConfirmDialog from '../components/ConfirmDialog';
import PullUpSheet from '../components/PullUpSheet';
import LanguageSelect from '../components/LanguageSelect';
import { Text, TextInput } from '../components/Text';
import { WebView } from '../components/WebView';
import { getChineseSeeTarget, getWiktionaryDefinitions, getWiktionaryLanguage, hasWiktionaryEntry, type WiktionaryDefinition } from '../utils/wiktionary';
import { useWiktionaryPronunciation } from '../hooks/useWiktionaryPronunciation';
import { findPartOfSpeech } from '../utils/partOfSpeech';
import WordTransformButtons from '../components/WordTransformButtons';
import MasteryLevelSelector from '../components/MasteryLevelSelector';
import PronunciationAudio from '../components/PronunciationAudio';
import IpaBoxes from '../components/IpaBoxes';
import WordSenseList, { type WordSenseData } from '../components/WordSenseList';
import { Colors } from '../constants/theme';
import { getEndonym, isSameLanguage } from '../constants/languages';
import { isIpaKept, isWordIgnored, useStore } from '../store/useStore';
import { contextTranslationLines } from '../utils/wordOfTheDay';
import { MasteryLevel, RootTabParamList, WordContext, WordEntry } from '../types';
import { pickDefinition } from '../utils/definitionHighlight';
import { isGermanLanguage } from '../utils/compoundWords';
import { germanFullForms, getGermanExpandedForm } from '../utils/wordTransform';
import { emojiData } from '../utils/emojiData';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import { getScrapeIpaJS } from '../utils/scrapeIpaJS';
import { getScrapeGoogleIpaJS, getScrapeGoogleNumberJS } from '../utils/scrapeGoogleIpaJS';
import { findSavedWord, groupMates, hasCapitals, hasSpelling } from '../utils/wordForms';
import WordForms from '../components/WordForms';
import UnsavedContextCards from '../components/UnsavedContextCards';
import WordFrequency from '../components/WordFrequency';
import AnswerHistory from '../components/AnswerHistory';
import { addIpa, splitIpas } from '../utils/ipaList';
import { focusWiktionaryJS, wiktionaryNightJS } from '../utils/wiktionaryPageJS';

type WordLookupRouteProp = RouteProp<RootTabParamList, 'WordLookup'>;

// The mobile site, as the in-app browser gets anyway, in its night theme
const wiktionaryPageUrl = (word: string) => `https://en.m.wiktionary.org/wiki/${encodeURIComponent(word)}?minervanightmode=1`;
// The id of a language's heading on a Wiktionary page, e.g. "Serbo-Croatian" for Croatian
// The tabs above the browser and the handle over them, peeking under the details
const SHEET_PEEK_HEIGHT = 72;
const wiktionarySectionId = (language: string) => getWiktionaryLanguage(language).replace(/ /g, '_');
// Google's AI overview usually gives the IPA for "<language> IPA: <word>", e.g. "Deutsch IPA: Herz"
const googleIpaUrl = (word: string, language: string) =>
  `https://www.google.com/search?igu=1&q=${encodeURIComponent(`${getEndonym(language)} IPA: ${word}`)}`;
// "<language> define <word>", so Google doesn't pick an unrelated meaning (e.g. a math one)
const googleDefineUrl = (word: string, language: string) =>
  `https://www.google.com/search?igu=1&q=${encodeURIComponent(`${language} define ${word}`)}`;
// A number from the lyrics, e.g. 42 or 2024, which Wiktionary has no page on in the song's language
const isNumberWord = (word: string) => /^\p{N}+(?:[.,]\p{N}+)*$/u.test(word);
// Google's AI overview gives a number written out with its IPA, e.g. zweiundvierzig /ˈt͡svaɪ̯ʊntˌfiːɐ̯t͡sɪç/
const googleNumberUrl = (number: string, language: string) =>
  `https://www.google.com/search?igu=1&q=${encodeURIComponent(`how is the number ${number} written out in ${language} words, with IPA pronunciation`)}`;

export default function WordLookupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<WordLookupRouteProp>();
  const isFocused = useIsFocused();
  // A review that stepped aside for this page comes back once it's left
  useEffect(() => (isFocused ? resumeReview : undefined), [isFocused]);
  const { word, wordId, songId, songName, artistName, lyricsLine, translationLine, originalLanguages, source, occurrence: routeOccurrence, ipa: routeIpa } = route.params || {};
  // A line's translation with each translation on its own line, and the icons of their sites
  const senseTranslation = (sId: string | undefined, context: string | undefined, fallback?: string) => {
    const found = contextTranslationLines(useStore.getState().songs.find((song) => song.id === sId), context, fallback);
    return { translation: found?.text, translationIcons: found?.icons };
  };
  const insets = useSafeAreaInsets();

  const words = useStore((s) => s.words);
  const addOrUpdateWord = useStore((s) => s.addOrUpdateWord);
  const updateWordEntry = useStore((s) => s.updateWordEntry);
  const linkForms = useStore((s) => s.linkForms);
  const lowercaseWord = useStore((s) => s.lowercaseWord);
  const unmergeForm = useStore((s) => s.unmergeForm);
  const deleteWord = useStore((s) => s.deleteWord);
  const ignoredWords = useStore((s) => s.ignoredWords);
  const toggleIgnoredWord = useStore((s) => s.toggleIgnoredWord);
  const toggleKeepIpa = useStore((s) => s.toggleKeepIpa);
  const webViewRef = useRef<WebView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [canGoBackInWebView, setCanGoBackInWebView] = useState(false);
  // The browser sheet pulled up over the details
  const [sheetUp, setSheetUp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Where the details were when a drag began, to tell a drag down past their bottom
  const dragStartYRef = useRef(0);
  const setWebUrl = useStore((s) => s.setWebUrl);

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'useDefinition' && data.text) {
        takeWiktionaryDefinition(String(data.text));
      } else if (data.type === 'ipa' && data.results) {
        setScrapedIpaResults(data.results);
        // Fill in an empty pronunciation with the page's first IPA
        const firstIpa = (data.results as string[]).find(Boolean);
        if (firstIpa) {
          setPronunciation((current) => current || firstIpa);
        }
      } else if (data.type === 'spelledOut' && data.text) {
        // A number's written-out form, e.g. zweiundvierzig for 42, goes in an empty note
        setNote((current) => current || data.text);
      } else if (data.type === 'ipaError') {
        console.log('IPA scraping error:', data.message);
      }
    } catch {}
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
  useEffect(() => setStudyLanguage(language), [language]);
  const [pronunciation, setPronunciation] = useState('');
  const [masteryLevel, setMasteryLevel] = useState<MasteryLevel>('Seen');
  const [note, setNote] = useState('');
  const [scrapedIpaResults, setScrapedIpaResults] = useState<string[]>([]);
  // The Google tab searches "<word> <language> IPA" for a word Wiktionary has no IPA for, and reads it
  const [ipaSearch, setIpaSearch] = useState(false);
  const ipaSearchRef = useRef(false);
  // The Google lookup gives up after a while, so the spinner in the Pronunciation field stops too
  const [ipaSearchGaveUp, setIpaSearchGaveUp] = useState(false);
  ipaSearchRef.current = ipaSearch;
  const [definitionSuggestions, setDefinitionSuggestions] = useState<WiktionaryDefinition[]>([]);

  const uidRef = useRef(0);
  const mkUid = () => ++uidRef.current;

  const [wordSenses, setWordSenses] = useState<WordSenseData[]>([
    { uid: mkUid(), context: lyricsLine || '', emoji: '', ipa: '', definition: '', songId, songName, occurrence: routeOccurrence || 1 }
  ]);
  const [emojiPickerIndex, setEmojiPickerIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [undoData, setUndoData] = useState<{ block: WordSenseData; index: number } | null>(null);

  const [displayWord, setDisplayWord] = useState(word);
  // The Look Up card's IPA for this word, used instead of scraping the Wiktionary page
  const cardIpa = routeIpa && routeIpa.length > 0 && displayWord === word ? routeIpa : undefined;
  // Page the Wiktionary tab shows instead of displayWord when it has no entry (e.g. "hab'n" -> "haben")
  const [wiktionaryRedirect, setWiktionaryRedirect] = useState<{ from: string; to: string } | null>(null);
  const wiktionaryWord = wiktionaryRedirect && wiktionaryRedirect.from === displayWord ? wiktionaryRedirect.to : displayWord;

  // A number is looked up on Google, which reads its written-out form into the note and its IPA
  const numberWord = !!displayWord && isNumberWord(displayWord);

  // A word's contexts and those of its base and forms, which share their cards
  const withGroupContexts = (entry: WordEntry) => [
    ...(entry.contexts ?? []).map((c) => ({ c, ownerId: undefined as string | undefined })),
    ...groupMates(useStore.getState().words, entry).flatMap((m) => m.contexts.map((c) => ({ c, ownerId: m.id as string | undefined }))),
  ];

  const findExistingWord = () => (wordId ? words.find((entry) => entry.id === wordId) : findSavedWord(words, displayWord, language));

  useEffect(() => {
    setDisplayWord(word);
  }, [word]);

  // A form merged into another word before forms were linked opens as a word of its own
  useEffect(() => {
    if (!displayWord || wordId) return;
    const saved = findSavedWord(words, displayWord, language);
    if (!saved || saved.word.toLowerCase() === displayWord.toLowerCase()) return;
    const form = (saved.forms ?? []).find((f) => f.toLowerCase() === displayWord.toLowerCase());
    if (!form) return;
    filledLookupRef.current = undefined;
    void unmergeForm(saved.id, form);
  }, [displayWord, wordId, language, words]);

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
      if (isNewLookup) setUndoData(null);
      const existingWord = findExistingWord();
      // Picking another language for the same word keeps it and what's been typed, unless the word
      // is saved in that language, whose details then fill in
      if (!isNewLookup && (wordId || !existingWord)) return;
      if (existingWord) {
        setLanguage(existingWord.language);
        setPronunciation(existingWord.pronunciation || cardIpa?.[0] || '');
        setMasteryLevel(existingWord.masteryLevel || 'Seen');
        setNote(existingWord.note ?? '');

        const allContexts = withGroupContexts(existingWord);
        if (allContexts.length > 0) {
          const exactMatchIndex = allContexts.findIndex(({ c }) =>
            c.songId === songId && c.context === lyricsLine && (c.occurrence || 1) === (routeOccurrence || 1)
          );
          const hasNewContextFromLearn = source === 'Learn' && lyricsLine && exactMatchIndex < 0;

          const mapContext = ({ c, ownerId }: { c: WordContext; ownerId?: string }): WordSenseData => ({
            uid: mkUid(),
            ownerId,
            context: c.context,
            emoji: c.emoji || '',
            ipa: c.ipa || '',
            definition: c.definition || '',
            songId: c.songId,
            songName: c.songName,
            occurrence: c.occurrence || 1,
            fromSong: c.fromSong ?? false,
            // A word saved before its line was translated gets the translation Learn has now
            ...senseTranslation(c.songId, c.context, c.translation || (c.songId === songId && c.context === lyricsLine ? translationLine : undefined)),
            partOfSpeech: c.partOfSpeech,
            definitionAt: c.definitionAt,
          });

          if (exactMatchIndex >= 0) {
            const first = mapContext(allContexts[exactMatchIndex]);
            const rest = allContexts.filter((_, i) => i !== exactMatchIndex).map(mapContext);
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
              ...senseTranslation(songId, lyricsLine, translationLine),
              fromSong: true,
              occurrence: routeOccurrence || 1,
              isNew: true,
            };
            const existingBlocks = allContexts.map(mapContext);
            setWordSenses([...existingBlocks, newBlock]);
          } else {
            const existingBlocks = allContexts.map(mapContext);
            setWordSenses(existingBlocks);
          }
        } else {
          setWordSenses([{ uid: mkUid(), context: lyricsLine || '', emoji: '', ipa: '', definition: '', songId, songName, ...senseTranslation(songId, lyricsLine, translationLine), fromSong: !!(source === 'Learn' && lyricsLine), occurrence: routeOccurrence || 1, isNew: true }]);
        }
      } else {
        setPronunciation(cardIpa?.[0] ?? '');
        setMasteryLevel('Seen');
        setNote('');
        setWordSenses([{ uid: mkUid(), context: lyricsLine || '', emoji: '', ipa: '', definition: '', songId, songName, ...senseTranslation(songId, lyricsLine, translationLine), fromSong: !!(source === 'Learn' && lyricsLine), occurrence: routeOccurrence || 1, isNew: true }]);
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
    if (masteryLevel !== (existing.masteryLevel || 'Seen')) return true;
    if (note.trim() !== (existing.note ?? '')) return true;
    const normalizeSense = (s: any) => `${s.context || ''}|${s.emoji || ''}|${s.ipa || ''}|${s.definition || ''}|${s.songId || ''}|${s.occurrence || 1}|${s.partOfSpeech || ''}|${s.definitionAt ?? ''}`;
    const currentNormalized = wordSenses
      .filter(b => b.context || b.emoji || b.ipa || b.definition)
      .map(normalizeSense)
      .sort()
      .join('||');
    const storedNormalized = withGroupContexts(existing)
      .map(({ c }) => normalizeSense(c))
      .sort()
      .join('||');
    return currentNormalized !== storedNormalized;
  }, [displayWord, isNewWord, language, pronunciation, masteryLevel, note, wordSenses, words]);

  // The word a language was picked by hand for, which stops the switch to the song's next language
  const languagePickedForRef = useRef<string | undefined>(undefined);
  // A saved word with no details that was moved to another of its song's languages, saved there in place
  const relanguageRef = useRef<{ id: string; language: string } | null>(null);
  const pickLanguage = (picked: string) => {
    languagePickedForRef.current = displayWord;
    setLanguage(picked);
  };

  // Suggest the word's Wiktionary definitions in the selected language for each context's definition.
  // In a song with more than one language, a new word with no entry in this language switches to the
  // song's next language that has one (e.g. Spanish "perdona" in a German and Spanish song)
  useEffect(() => {
    setDefinitionSuggestions([]);
    if (!wiktionaryWord || !language) return;
    let cancelled = false;
    getWiktionaryDefinitions(wiktionaryWord, language).then(async (definitions) => {
      if (cancelled || !definitions) return;
      if (definitions.length > 0) {
        setDefinitionSuggestions(definitions);
        return;
      }
      // A German word with its ending dropped, e.g. lieg for liege, suggests its full form's meanings
      if (isGermanLanguage([language])) {
        for (const candidate of germanFullForms(wiktionaryWord)) {
          const full = await getWiktionaryDefinitions(candidate, language);
          if (cancelled) return;
          if (full && full.length > 0) {
            setDefinitionSuggestions(full);
            return;
          }
        }
      }
      const existing = findExistingWord();
      // A saved word with no IPA and no meaning, e.g. a French word saved as German in a German and French
      // song, is moved to the song's language that has it; one with details of its own stays as it is
      const bare = !!existing && !existing.pronunciation?.trim() && !existing.definitions?.length &&
        !(existing.contexts ?? []).some((c) => c.definition?.trim() || c.ipa?.trim());
      if (languagePickedForRef.current === displayWord || (existing && !bare) || (!existing && wordId)) return;
      const fromSongs = originalLanguages?.length
        ? originalLanguages
        : [...new Set((existing?.contexts ?? []).flatMap((c) => useStore.getState().songs.find((song) => song.id === c.songId)?.originalLanguages ?? []))];
      const songLanguages = fromSongs;
      const at = songLanguages.findIndex((songLanguage) => isSameLanguage(songLanguage, language));
      if (at < 0 && !existing) return;
      // A new word moves on to the song's next languages, a saved one to any of its other languages
      const candidates = existing
        ? songLanguages.filter((songLanguage) => !isSameLanguage(songLanguage, language))
        : songLanguages.slice(at + 1);
      for (const next of candidates) {
        const found = await getWiktionaryDefinitions(wiktionaryWord, next);
        if (cancelled) return;
        if (found && found.length > 0) {
          if (existing) relanguageRef.current = { id: existing.id, language: next };
          setLanguage(next);
          return;
        }
      }
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
        setNote((current) => withAbbreviationNote(current, picked));
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
        ? (isNumberWord(displayWord) ? googleNumberUrl(displayWord, languageRef.current)
          : ipaSearchRef.current ? googleIpaUrl(displayWord, languageRef.current) : googleDefineUrl(displayWord, languageRef.current))
        : `${wiktionaryPageUrl(wiktionaryWord!)}#${wiktionarySectionId(languageRef.current)}`;
      setCurrentUrl(url);
      setScrapedIpaResults([]);
    };

    // Start each new word on Wiktionary when it has an entry, otherwise on Google; tapping a tab still switches
    if (entryCheckedWordRef.current !== displayWord) {
      entryCheckedWordRef.current = displayWord;
      ipaSearchRef.current = false;
      setIpaSearch(false);
      if (isNumberWord(displayWord)) {
        if (lookupSource === 'google') open('google');
        else setLookupSource('google');
        return () => {
          cancelled = true;
        };
      }
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
          // A German word with its ending dropped and no apostrophe, e.g. lieg, shows its full form's page (liege)
          const dropped = !expanded && isGermanLanguage([languageRef.current]) ? germanFullForms(displayWord) : [];
          const candidates = expanded ? [...new Set([expanded.toLowerCase(), expanded])] : dropped;
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
        // A simplified Chinese word's page only points to its traditional form (财 -> 財), so open that page
        if (exists) {
          const traditional = await getChineseSeeTarget(displayWord, languageRef.current);
          if (traditional && traditional !== displayWord && (await hasWiktionaryEntry(traditional))) {
            if (!cancelled) {
              setWiktionaryRedirect({ from: displayWord, to: traditional });
              setLookupSource('wiktionary');
            }
            return;
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
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      // Back first takes the browser down to the details; its own arrow goes back a page
      if (sheetUp) {
        setSheetUp(false);
        return true;
      }

      if (backToPage()) return true;
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
  }, [menuOpen, sheetUp, isFocused, navigation, source, songId]);

  // `at` is where a definition was picked in the line's translation
  const updateWordSense = (index: number, field: keyof WordSenseData, value: string | number, at?: number) => {
    setUndoData(null);
    if (field === 'definition') setNote((current) => withAbbreviationNote(current, String(value)));
    setWordSenses(prev => prev.map((b, i) => {
      if (i !== index) return b;
      if (field !== 'definition') return { ...b, [field]: value };
      const definition = String(value);
      // Picked again elsewhere in the translation, or typed: keep the place only when just the case changed
      const definitionAt = at ?? (definition.toLowerCase() === b.definition.toLowerCase() ? b.definitionAt : undefined);
      // Another definition can be another type of word, found again when saving
      return definition !== b.definition
        ? { ...b, definition, definitionAt, partOfSpeech: undefined }
        : { ...b, definitionAt };
    }));
  };

  const addWordSense = () => {
    setUndoData(null);
    setWordSenses(prev => [...prev, { uid: mkUid(), context: '', emoji: '', ipa: '', definition: '', songId, songName, occurrence: 1, isNew: true }]);
  };

  // A meaning picked with "+ Use" on the Wiktionary page goes in the first context without one, else a new context
  const takeWiktionaryDefinition = (definition: string) => {
    setUndoData(null);
    setNote((current) => withAbbreviationNote(current, definition));
    setWordSenses(prev => {
      const index = prev.findIndex(b => !b.definition.trim());
      if (index >= 0) {
        return prev.map((b, i) => (i === index ? { ...b, definition, definitionAt: undefined, partOfSpeech: undefined } : b));
      }
      return [...prev, { uid: mkUid(), context: '', emoji: '', ipa: '', definition, songId, songName, occurrence: 1, isNew: true }];
    });
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

    const toContext = (b: WordSenseData): WordContext => ({
        context: b.context,
        emoji: b.emoji || undefined,
        ipa: b.ipa || undefined,
        definition: b.definition || undefined,
        songId: b.songId,
        songName: b.songName,
        fromSong: b.fromSong ?? false,
        occurrence: b.occurrence || 1,
        translation: b.translation || undefined,
        definitionAt: b.definition ? b.definitionAt : undefined,
        partOfSpeech: b.definition
          ? b.partOfSpeech ?? findPartOfSpeech(b.definition, definitionSuggestions)
          : undefined,
    });
    const filled = (b: WordSenseData) => !!(b.context || b.emoji || b.ipa || b.definition);
    const contexts = wordSenses.filter((b) => filled(b) && !b.ownerId).map(toContext);

    setIsSaving(true);
    try {
      const moved = relanguageRef.current;
      relanguageRef.current = null;
      if (moved && isSameLanguage(moved.language, language)) await updateWordEntry(moved.id, { language });
      await addOrUpdateWord(
        displayWord, language, pronunciation, contexts, masteryLevel,
        wiktionaryPronunciation.loaded ? pronunciationAudio : undefined
      );
      // Cards that belong to the base or another form are saved back on that word
      const owners = new Set(wordSenses.map((b) => b.ownerId).filter((id): id is string => !!id));
      const savedNow = findExistingWord();
      const mates = savedNow ? groupMates(useStore.getState().words, savedNow) : [];
      for (const mate of mates) {
        if (!owners.has(mate.id) && !mate.contexts.length) continue;
        const kept = wordSenses.filter((b) => filled(b) && b.ownerId === mate.id).map(toContext);
        if (JSON.stringify(kept) !== JSON.stringify(mate.contexts)) await updateWordEntry(mate.id, { contexts: kept });
      }
      // The note is kept apart from what addOrUpdateWord merges
      const saved = findSavedWord(useStore.getState().words, displayWord, language);
      if (saved && (saved.note ?? '') !== note.trim()) await updateWordEntry(saved.id, { note: note.trim() || undefined });
    } finally {
      setIsSaving(false);
    }

    if (source === 'Words') {
      navigation.navigate('Words');
    } else if (source === 'Learn' && songId) {
      navigation.navigate('Learn', { songId });
    } else {
      navigation.goBack();
    }
  };

  // A page opened by tapping a word in a context's line goes back to the page it came from first
  const backToPage = () => {
    if (!route.params?.from) return false;
    navigation.navigate('WordLookup', route.params.from);
    return true;
  };

  // A word of a context's line looks up on its own page, in that line's song, with back going to this page
  const openLineWord = (tapped: string, tappedOccurrence: number, block: WordSenseData) => {
    const blockSong = block.songId ? useStore.getState().songs.find((song) => song.id === block.songId) : undefined;
    const saved = findSavedWord(useStore.getState().words, tapped, language);
    navigation.navigate('WordLookup', {
      word: tapped,
      wordId: saved?.id,
      songId: block.songId ?? songId,
      songName: blockSong?.songName ?? block.songName ?? songName,
      artistName: blockSong?.artistName ?? artistName,
      lyricsLine: block.context,
      translationLine: block.translation,
      originalLanguages: blockSong?.originalLanguages ?? [language],
      source: block.songId || songId ? 'Learn' : source,
      occurrence: tappedOccurrence,
      from: route.params,
    });
  };

  const handleCancel = () => {
    if (backToPage()) return;
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
    setIpaSearch(false);
    setLookupSource('google');
  };

  const switchToWiktionary = () => {
    setIpaSearch(false);
    setLookupSource('wiktionary');
  };

  const searchGoogleForIpa = () => {
    if (!displayWord) return;
    setIpaSearchGaveUp(false);
    ipaSearchRef.current = true;
    setIpaSearch(true);
    setScrapedIpaResults([]);
    setLookupSource('google');
    setCurrentUrl(googleIpaUrl(displayWord, language));
  };

  const handleWebViewGoBack = () => {
    if (canGoBackInWebView && webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  // A guess for a word the page has no IPA for, e.g. fang's /faŋ/ from fangen /ˈfaŋən/
  const derivedIpa = wiktionaryPronunciation.derivedFrom && !cardIpa ? wiktionaryPronunciation.ipa : [];
  const searchingGoogleIpa = ipaSearch && lookupSource === 'google' && !ipaSearchGaveUp
    && scrapedIpaResults.length === 0 && !pronunciation.trim();
  useEffect(() => {
    if (!searchingGoogleIpa) return;
    const timer = setTimeout(() => setIpaSearchGaveUp(true), 25000);
    return () => clearTimeout(timer);
  }, [searchingGoogleIpa]);
  const pageIpa = lookupSource === 'wiktionary' || ipaSearch || numberWord ? scrapedIpaResults : [];
  const ipaOptions = cardIpa ?? (pageIpa.length > 0 ? pageIpa : derivedIpa);
  // Fill in an empty pronunciation with the guess, as the page's own IPA would be
  const firstDerivedIpa = derivedIpa[0];
  useEffect(() => {
    if (firstDerivedIpa) setPronunciation((current) => current || firstDerivedIpa);
  }, [firstDerivedIpa]);

  // Wiktionary has no IPA for the word in this language, so Google can be asked instead
  // (or only a guess at it)
  const wiktionaryHasNoIpa = !cardIpa && wiktionaryPronunciation.loaded
    && (wiktionaryPronunciation.ipa.length === 0 || !!wiktionaryPronunciation.derivedFrom)
    && !(lookupSource === 'wiktionary' && scrapedIpaResults.length > 0);

  // A context without its own IPA shows the word's first one
  const wordIpas = useMemo(() => splitIpas(pronunciation), [pronunciation]);
  const ipaPlaceholder = wordIpas[0]
    ? (/[/[\]]/.test(wordIpas[0]) ? wordIpas[0] : `/${wordIpas[0]}/`)
    : 'IPA';

  const existingWord = findExistingWord();

  const sourceTab = (source: 'wiktionary' | 'google', label: string, icon: 'book-outline' | 'logo-google') => {
    const active = lookupSource === source;
    return (
      <TouchableOpacity
        style={[styles.sourceButton, active && styles.sourceButtonActive]}
        // Tapping a tab also pulls the browser up
        onPress={() => {
          if (source === 'google') switchToGoogle();
          else switchToWiktionary();
          setSheetUp(true);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        <Ionicons name={icon} size={18} color={active ? Colors.primaryLight : Colors.text} />
        <Text style={[styles.sourceButtonText, active && styles.sourceButtonTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const sourceTabs = (
    <View style={styles.sourceSelector} accessibilityRole="tablist">
      {sheetUp && (
        <TouchableOpacity
          onPress={() => setSheetUp(false)}
          style={styles.sheetDownButton}
          accessibilityRole="button"
          accessibilityLabel="Back to the word's details"
        >
          <Ionicons name="chevron-down" size={22} color={Colors.text} />
        </TouchableOpacity>
      )}
      {sourceTab('wiktionary', 'Wiktionary', 'book-outline')}
      {sourceTab('google', 'Google', 'logo-google')}
    </View>
  );

  const browser = (
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
              if (lookupSource === 'wiktionary' && webViewRef.current) {
                // Night theme, the word's language only, and "+ Use" on each meaning
                webViewRef.current.injectJavaScript(focusWiktionaryJS(wiktionarySectionId(language)));
              }
              if (lookupSource === 'wiktionary' && !cardIpa && webViewRef.current) {
                webViewRef.current.injectJavaScript(getScrapeIpaJS(language));
              } else if (lookupSource === 'google' && numberWord && webViewRef.current) {
                webViewRef.current.injectJavaScript(getScrapeGoogleNumberJS());
              } else if (lookupSource === 'google' && ipaSearchRef.current && webViewRef.current) {
                webViewRef.current.injectJavaScript(getScrapeGoogleIpaJS());
              }
            }}
            javaScriptEnabled
            injectedJavaScriptBeforeContentLoaded={wiktionaryNightJS}
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
  );

  const openInWebTab = () => {
    setMenuOpen(false);
    if (!currentUrl) return;
    setWebUrl(currentUrl);
    navigation.navigate('Web');
  };

  const copyWord = async () => {
    setMenuOpen(false);
    if (displayWord) await Clipboard.setStringAsync(displayWord);
  };

  const nothingToSave = !hasChanges && !isNewWord;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      // Android pans the window for the keyboard already, and 'height' left a gap above the system nav once the tab bar was hidden
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayWord}</Text>
        <TouchableOpacity
          onPress={() => setMenuOpen((open) => !open)}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="More actions"
        >
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <PullUpSheet
        expanded={sheetUp}
        onExpandedChange={setSheetUp}
        peekHeight={SHEET_PEEK_HEIGHT}
        top={sourceTabs}
        sheet={browser}
      >
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={{ paddingBottom: SHEET_PEEK_HEIGHT + 16 }}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={(e) => {
          dragStartYRef.current = e.nativeEvent.contentOffset.y;
        }}
        onScrollEndDrag={(e) => {
          // Scrolling on past the bottom of the details pulls the browser up
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 8;
          if (atBottom && contentOffset.y >= dragStartYRef.current) setSheetUp(true);
        }}
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
              onValueChange={pickLanguage}
              placeholder="Select language"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pronunciation</Text>
            <IpaBoxes value={pronunciation} onChange={setPronunciation} loading={searchingGoogleIpa} />
            {!numberWord && wiktionaryHasNoIpa && !pronunciation.trim() && !(ipaSearch && lookupSource === 'google') && (
              <TouchableOpacity
                style={styles.ipaSearchButton}
                onPress={searchGoogleForIpa}
                accessibilityRole="button"
                accessibilityLabel={`Find the IPA of ${displayWord} on Google`}
              >
                <Ionicons name="logo-google" size={14} color={Colors.primary} />
                <Text style={styles.ipaSearchButtonText}>No IPA on Wiktionary. Find it on Google</Text>
              </TouchableOpacity>
            )}
            {ipaOptions.length > 0 && (
              <View style={styles.ipaResultsRow}>
                {ipaOptions.filter(ipa => ipa && !pronunciation.includes(ipa)).map((ipa, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.ipaResultButton, styles.ipaResultButtonRow]}
                    // Adds it to the IPAs already there, so a word can keep several
                    onPress={() => setPronunciation((current) => addIpa(current, ipa))}
                    accessibilityLabel={`Add IPA ${ipa}`}
                  >
                    <Ionicons name="add" size={14} color={Colors.primaryLight} />
                    <Text style={styles.ipaResultButtonText}>{ipa}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <PronunciationAudio audio={pronunciationAudio} wordId={savedWord?.id} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Level</Text>
            <MasteryLevelSelector value={masteryLevel} onChange={setMasteryLevel} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              style={[styles.fieldInput, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="A mnemonic, a grammar tip..."
              placeholderTextColor={Colors.textMuted}
              multiline
              accessibilityLabel="Note"
            />
          </View>

          {existingWord && hasCapitals(existingWord) && (
            <TouchableOpacity
              onPress={async () => {
                filledLookupRef.current = undefined;
                const kept = await lowercaseWord(existingWord.id);
                if (kept) navigation.setParams({ wordId: kept.id, word: kept.word });
              }}
              style={styles.lowercaseButton}
              accessibilityRole="button"
              accessibilityLabel="Lowercase word and meanings"
            >
              <Ionicons name="text-outline" size={16} color={Colors.primaryLight} />
              <Text style={styles.lowercaseText}>Lowercase “{existingWord.word}” and its meanings</Text>
            </TouchableOpacity>
          )}

          {!existingWord && displayWord !== displayWord.toLowerCase() && (
            <TouchableOpacity
              onPress={() => {
                filledLookupRef.current = undefined;
                setDisplayWord(displayWord.toLowerCase());
              }}
              style={styles.lowercaseButton}
              accessibilityRole="button"
              accessibilityLabel="Lowercase word"
            >
              <Ionicons name="text-outline" size={16} color={Colors.primaryLight} />
              <Text style={styles.lowercaseText}>Lowercase “{displayWord}”</Text>
            </TouchableOpacity>
          )}

          {existingWord && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Forms</Text>
              <WordForms
                entry={existingWord}
                words={words}
                onLink={(ids, baseId) => void linkForms(ids, baseId)}
                onSplit={(form) => {
                  filledLookupRef.current = undefined;
                  void unmergeForm(existingWord.id, form);
                }}
                onOpenSpelling={(form) => {
                  filledLookupRef.current = undefined;
                  navigation.setParams({ wordId: undefined, word: form });
                }}
                onOpen={(w) => {
                  filledLookupRef.current = undefined;
                  navigation.setParams({ wordId: w.id, word: w.word });
                }}
              />
            </View>
          )}

          {existingWord && (
            <View style={styles.field}>
              <WordFrequency entry={existingWord} />
            </View>
          )}

          {existingWord?.history && existingWord.history.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>History</Text>
              <AnswerHistory history={existingWord.history} />
            </View>
          )}

          <Text style={styles.fieldLabel}>Contexts</Text>
          <WordSenseList
            language={language}
            onWordPress={openLineWord}
            wordSenses={wordSenses}
            undoData={undoData}
            displayWord={displayWord}
            songName={songName}
            artistName={artistName}
            ipaPlaceholder={ipaPlaceholder}
            wordIpas={wordIpas}
            isNewWord={!!isNewWord}
            definitionSuggestions={definitionSuggestions}
            onUpdateWordSense={updateWordSense}
            onEmojiPress={setEmojiPickerIndex}
            onRemoveWordSense={removeWordSense}
            onUndoRemove={undoRemoveWordSense}
          />

          {existingWord && (
            <UnsavedContextCards
              word={existingWord.word}
              language={existingWord.language}
              savedContexts={wordSenses}
              suggestions={definitionSuggestions}
              onSave={(saved) => {
                setUndoData(null);
                setWordSenses(prev => [
                  ...prev,
                  {
                    uid: mkUid(),
                    context: saved.line,
                    emoji: '',
                    ipa: '',
                    definition: saved.definition || prev.find(b => b.definition.trim())?.definition || '',
                    songId: saved.songId,
                    songName: saved.songName,
                    translation: saved.translation,
                    fromSong: true,
                    occurrence: 1,
                    isNew: true,
                  },
                ]);
              }}
            />
          )}

          <TouchableOpacity style={styles.addContextButton} onPress={addWordSense} accessibilityRole="button">
            <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.addContextButtonText}>Add context</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      </PullUpSheet>

      {/* Save stays under the details and goes away while the browser is up */}
      {!sheetUp && (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, nothingToSave && styles.saveButtonDisabled]}
            disabled={isSaving || nothingToSave}
            accessibilityRole="button"
            accessibilityState={{ busy: isSaving, disabled: nothingToSave }}
          >
            {/* The label stays but goes invisible under the spinner, so the button keeps its height */}
            <Text style={[styles.saveButtonText, nothingToSave && styles.saveButtonTextDisabled, isSaving && { opacity: 0 }]}>
              {isNewWord ? 'Add word' : nothingToSave ? 'Saved' : 'Save word'}
            </Text>
            {isSaving && <ActivityIndicator size="small" color={Colors.white} style={StyleSheet.absoluteFill} />}
          </TouchableOpacity>
        </View>
      )}

      {menuOpen && (
        <>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu" />
          <View style={[styles.menu, { top: insets.top + 56 }]}>
            {!!currentUrl && (
              <TouchableOpacity style={styles.menuItem} onPress={openInWebTab} accessibilityRole="menuitem">
                <Ionicons name="open-outline" size={18} color={Colors.text} />
                <Text style={styles.menuText}>Open page in Web tab</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={copyWord} accessibilityRole="menuitem">
              <Ionicons name="copy-outline" size={18} color={Colors.text} />
              <Text style={styles.menuText}>Copy word</Text>
            </TouchableOpacity>
            {!!displayWord && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  void toggleIgnoredWord(existingWord?.word ?? displayWord, existingWord?.language ?? language);
                }}
                accessibilityRole="menuitem"
              >
                <Ionicons
                  name={isWordIgnored(ignoredWords, existingWord?.word ?? displayWord, existingWord?.language ?? language) ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={Colors.text}
                />
                <Text style={styles.menuText}>{isWordIgnored(ignoredWords, existingWord?.word ?? displayWord, existingWord?.language ?? language) ? 'Unignore' : 'Ignore'}</Text>
              </TouchableOpacity>
            )}
            {!!displayWord && isWordIgnored(ignoredWords, existingWord?.word ?? displayWord, existingWord?.language ?? language) && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  void toggleKeepIpa(existingWord?.word ?? displayWord, existingWord?.language ?? language);
                }}
                accessibilityRole="menuitem"
              >
                <Ionicons name="language-outline" size={18} color={Colors.text} />
                <Text style={styles.menuText}>
                  {isIpaKept(ignoredWords, existingWord?.word ?? displayWord, existingWord?.language ?? language) ? 'Stop keeping IPA' : 'Keep IPA'}
                </Text>
              </TouchableOpacity>
            )}
            {existingWord && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  setShowDeleteConfirm(true);
                }}
                accessibilityRole="menuitem"
              >
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                <Text style={[styles.menuText, { color: Colors.danger }]}>Delete word</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
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
  lowercaseButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, alignSelf: 'flex-start' },
  lowercaseText: { fontSize: 14, color: Colors.primaryLight },
  noteInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
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
  ipaSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
  },
  ipaSearchButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  ipaResultButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  addContextButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  sourceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
    backgroundColor: 'rgba(108, 92, 231, 0.18)',
    borderColor: Colors.primary,
  },
  sourceButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sourceButtonTextActive: {
    color: Colors.primaryLight,
  },
  webViewContainer: {
    flex: 1,
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  sheetDownButton: {
    padding: 4,
  },
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.surface,
  },
  menu: {
    position: 'absolute',
    right: 12,
    minWidth: 210,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 15,
    color: Colors.text,
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
