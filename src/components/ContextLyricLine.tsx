import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { makeIgnoredWordChecker, useStore } from '../store/useStore';
import { cleanLyricWord, isTappableLyric, splitEdgePunctuation, splitLyricTokens } from '../utils/cleanLyrics';
import { groupCjkTokens, groupSpacedWords } from '../utils/cjkWords';
import { songWordIndex } from '../utils/lyricGaps';
import { findWordOccurrences } from '../utils/wordOccurrences';
import { formatIpa } from '../utils/ipaDisplay';
import { firstIpa } from '../utils/ipaList';
import { getPreloadedIpa, loadPreloadedIpa } from '../utils/preloadedIpa';
import { elisionDisplayParts, isElidingLanguage } from '../utils/wordTransform';
import { removeStressMarks } from '../utils/russianStress';

interface ContextLyricLineProps {
  line: string;
  /** The word the Look Up page is about, marked in the line */
  word?: string;
  /** Which time the word is in the line, when it's there more than once */
  occurrence?: number;
  /** The song's languages, to find saved words and preloaded IPA in */
  languages?: string[];
  fontSize?: number;
  /** A word other than the current one was tapped: its spelling and which time it is in the line */
  onWordPress?: (word: string, occurrence: number) => void;
  /** The current word again, when it's in the line more than once, was tapped */
  onOccurrencePress?: (occurrence: number) => void;
}

/**
 * A song line as Learn draws it: words in their level's color with their IPA above (saved, else preloaded),
 * the Look Up page's word underlined, and every other word tapping through to its own page
 */
export default function ContextLyricLine({
  line,
  word,
  occurrence = 1,
  languages,
  fontSize = 16,
  onWordPress,
  onOccurrencePress,
}: ContextLyricLineProps) {
  const words = useStore((s) => s.words);
  const showIpa = useStore((s) => s.showIpa);
  const showIpaBrackets = useStore((s) => s.showIpaBrackets);
  const showMasteryLevelColors = useStore((s) => s.showMasteryLevelColors);
  const quietKnownWords = useStore((s) => s.quietKnownWords);
  const wideWordSpacing = useStore((s) => s.wideWordSpacing);
  const ignoredWords = useStore((s) => s.ignoredWords);
  const isIgnored = useMemo(() => makeIgnoredWordChecker(ignoredWords), [ignoredWords]);
  const index = useMemo(() => songWordIndex(words, languages), [words, languages]);
  // The IPA preloaded for words not saved is read from the cache, which is read from storage once
  const [, setCacheLoaded] = useState(false);
  useEffect(() => {
    void loadPreloadedIpa().then(() => setCacheLoaded(true));
  }, []);

  const entryOf = (cleaned: string) => (cleaned ? index.get(removeStressMarks(cleaned.toLowerCase())) : undefined);

  const tokens = useMemo(() => {
    const isWord = (candidate: string) => !!entryOf(candidate) || (!!word && candidate.toLowerCase() === word.toLowerCase());
    return groupSpacedWords(groupCjkTokens(splitLyricTokens(line), isWord), isWord);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, index, word]);

  // The characters of the current word, to tell which tokens it covers
  const current = useMemo(() => {
    const ranges = word ? findWordOccurrences(line, word) : [];
    return ranges[Math.min(occurrence, ranges.length) - 1] ?? null;
  }, [line, word, occurrence]);

  const language = languages?.[0];
  let offset = 0;
  const seen: Record<string, number> = {};
  return (
    <View style={[styles.row, { rowGap: wideWordSpacing ? fontSize * 0.4 : 0 }]}>
      {tokens.map((token, i) => {
        const start = offset;
        offset += token.length;
        if (!token.trim()) {
          return (
            <Text key={i} style={{ fontSize, lineHeight: fontSize * 1.6, marginHorizontal: wideWordSpacing ? fontSize * 0.3 : 0 }}>
              {token}
            </Text>
          );
        }
        const cleaned = cleanLyricWord(token);
        const { leading, core, trailing } = splitEdgePunctuation(token);
        const entry = entryOf(cleaned);
        const key = cleaned.toLowerCase();
        seen[key] = (seen[key] ?? 0) + 1;
        const tokenOccurrence = seen[key];
        const isCurrent = !!current && start < current[1] && start + token.length > current[0];
        const isSameWord = !isCurrent && !!word && key === word.toLowerCase();
        const pressable = !isCurrent && !!cleaned && isTappableLyric(cleaned) && (!!onWordPress || (isSameWord && !!onOccurrencePress));

        const ipaSource = entry && !(quietKnownWords && entry.masteryLevel === 'Known' && !isCurrent)
          ? entry.contexts?.find((c) => c.context === line && c.ipa)?.ipa || entry.pronunciation
          : undefined;
        const ipa = showIpa
          ? firstIpa(ipaSource) ? formatIpa(ipaSource!, showIpaBrackets)
            : !entry && cleaned && !cleaned.includes(' ') && getPreloadedIpa(language, cleaned)
              ? formatIpa(getPreloadedIpa(language, cleaned)!, showIpaBrackets)
              : ''
          : '';
        const color = isCurrent
          ? Colors.primary
          : !entry && !!cleaned && !!language && isIgnored(cleaned, language)
            ? Colors.textMuted
          : showMasteryLevelColors && entry?.masteryLevel
            ? getMasteryLevelColor(entry.masteryLevel)
            : Colors.text;
        // An elided word not saved whole, e.g. n'passe, colors each part by its own level like Learn
        const elision = !entry && !isCurrent && isElidingLanguage(language) ? elisionDisplayParts(cleaned, core) : null;
        const partNodes = elision
          ? elision.parts.map((part, pi) => {
              const partEntry = part ? entryOf(part) : undefined;
              const partColor = showMasteryLevelColors && partEntry?.masteryLevel ? getMasteryLevelColor(partEntry.masteryLevel) : color;
              return <Text key={pi} style={{ color: partColor, fontSize, lineHeight: fontSize * 1.6 }}>{elision.display[pi]}</Text>;
            })
          : null;
        const onPress = !pressable
          ? undefined
          : isSameWord ? () => onOccurrencePress?.(tokenOccurrence) : () => onWordPress?.(cleaned, tokenOccurrence);
        return (
          <View key={i} style={styles.column}>
            <View style={styles.annotationSpace}>
              {!!ipa && <Text style={styles.annotation}>{ipa}</Text>}
            </View>
            <Text
              onPress={onPress}
              accessibilityRole={onPress ? 'button' : undefined}
              accessibilityLabel={onPress ? `Look up ${cleaned}` : undefined}
              style={{
                fontSize,
                lineHeight: fontSize * 1.6,
                color: Colors.text,
                ...(isCurrent ? { textDecorationLine: 'underline', fontWeight: '700' } : null),
              }}
            >
              {leading}
              <Text style={{ color, fontSize, lineHeight: fontSize * 1.6, ...(isCurrent ? { textDecorationLine: 'underline', fontWeight: '700' } : null) }}>
                {partNodes ?? core}
              </Text>
              {trailing}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  column: { alignItems: 'center' },
  annotationSpace: { minHeight: 14, marginBottom: -6, flexDirection: 'row', gap: 4 },
  annotation: { fontSize: 10, color: Colors.textSecondary },
});
