import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFlagForLanguage, getLanguageNameFromCode } from '../constants/languages';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { usePersistedState } from '../hooks/usePersistedState';
import { CEFR_LEVELS, LEVEL_WEIGHTS, PRE_A1, type CefrProgress } from '../utils/cefr';
import { MASTERY_LEVELS } from '../types';
import ProgressRing from './ProgressRing';
import { Text } from './Text';

const n = (count: number) => count.toLocaleString('en-US');
const languageName = (language: string) => getLanguageNameFromCode(language) ?? language;

/** "860 to B2", or "C2" when there's no next level */
export const toNextLabel = (p: CefrProgress) => (p.next ? `${n(p.to - p.mastered)} to ${p.next}` : 'Top level');

/** The level as a small outlined pill, greyed for Pre-A1 */
export function CefrPill({ level, small }: { level: string; small?: boolean }) {
  const pre = level === PRE_A1;
  return (
    <View style={[styles.pill, small && styles.pillSmall, pre && styles.pillPre]}>
      <Text style={[styles.pillText, { fontSize: small ? 11 : 13 }, pre && styles.pillTextPre]}>{level}</Text>
    </View>
  );
}

/** A thin bar of how far it is to the next level */
export function CefrMiniBar({ progress, width, height = 4 }: { progress: CefrProgress; width?: number; height?: number }) {
  return (
    <View style={[styles.miniTrack, { height, borderRadius: height / 2 }, { width: width ?? '100%' }]}>
      <View style={[styles.miniFill, { width: `${Math.round(progress.fraction * 100)}%` }]} />
    </View>
  );
}

/** The flag with a ring of how far it is to the next level, and the level as a badge */
export function CefrFlagRing({ progress, size = 36 }: { progress: CefrProgress; size?: number }) {
  return (
    <View style={{ width: size + 8, height: size + 4 }}>
      <ProgressRing
        percent={progress.fraction * 100}
        size={size}
        thickness={3}
        color={Colors.primaryLight}
        accessibilityLabel={`${languageName(progress.language)} vocabulary ${progress.level}, ${toNextLabel(progress)}`}
      >
        <Text style={{ fontSize: size * 0.5 }}>{getFlagForLanguage(progress.language)}</Text>
      </ProgressRing>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{progress.level === PRE_A1 ? 'A0' : progress.level}</Text>
      </View>
    </View>
  );
}

/**
 * The language's level on the Words screen: the A1 to C2 ladder with the next level filling up, or a
 * one-line strip of it. Tapping it switches between the two; the arrow opens the ladder sheet.
 */
export function CefrCard({ progress, onOpen }: { progress: CefrProgress; onOpen: () => void }) {
  const [compact, setCompact] = usePersistedState('@lyricsionary_cefr_compact', false, (v): v is boolean => typeof v === 'boolean');
  const reachedIndex = CEFR_LEVELS.indexOf(progress.level as never);
  const openButton = (
    <TouchableOpacity onPress={onOpen} hitSlop={10} accessibilityRole="button" accessibilityLabel="What the vocabulary level means">
      <Ionicons name="chevron-up-circle-outline" size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
  return (
    <Pressable
      style={styles.card}
      onPress={() => setCompact(!compact)}
      accessibilityRole="button"
      accessibilityLabel={`Vocabulary level ${progress.level}, ${n(progress.mastered)} words known, ${toNextLabel(progress)}. Tap to ${compact ? 'show the ladder' : 'make it smaller'}`}
    >
      <View style={styles.cardRow}>
        {compact ? (
          <Text style={styles.cardText} numberOfLines={1}>
            <Text style={styles.cardStrong}>{progress.level}</Text> · {n(progress.mastered)} words known
          </Text>
        ) : (
          <Text style={styles.cardText} numberOfLines={1}>
            Vocabulary ≈ <Text style={styles.cardStrong}>{progress.level}</Text>
          </Text>
        )}
        <Text style={styles.cardText} numberOfLines={1}>
          {progress.next ? (
            compact ? (
              <>
                {n(progress.to - progress.mastered)} to <Text style={styles.cardStrong}>{progress.next}</Text>
              </>
            ) : (
              <>
                <Text style={styles.cardStrong}>{n(progress.mastered)}</Text> / {n(progress.to)} to {progress.next}
              </>
            )
          ) : (
            <Text style={styles.cardStrong}>{n(progress.mastered)} words</Text>
          )}
        </Text>
        {openButton}
      </View>
      {compact ? (
        <View style={{ marginTop: 8 }}>
          <CefrMiniBar progress={progress} height={6} />
        </View>
      ) : (
        <View style={styles.ladder}>
          {CEFR_LEVELS.map((level, i) => {
            const done = i <= reachedIndex;
            const current = i === reachedIndex + 1;
            return (
              <View key={level} style={[styles.step, done && styles.stepDone, current && styles.stepCurrent]}>
                {current && <View style={[styles.stepFill, { width: `${Math.round(progress.fraction * 100)}%` }]} />}
                <Text style={[styles.stepText, (done || current) && styles.stepTextOn]}>{level}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

/** Each language's level in a row: flag, level, bar to the next level; tapping one picks it */
export function CefrLanguageRows({ all, onPress }: { all: CefrProgress[]; onPress: (p: CefrProgress) => void }) {
  return (
    <>
      {all.map((p, i) => (
        <TouchableOpacity
          key={p.language}
          style={[styles.langRow, i === all.length - 1 && { borderBottomWidth: 0 }]}
          onPress={() => onPress(p)}
          accessibilityRole="button"
          accessibilityLabel={`${languageName(p.language)} vocabulary ${p.level}, ${n(p.mastered)} words, ${toNextLabel(p)}`}
        >
          <Text style={styles.langFlag}>{getFlagForLanguage(p.language)}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.langTop}>
              <Text style={styles.langName} numberOfLines={1}>{languageName(p.language)}</Text>
              <CefrPill level={p.level} small />
            </View>
            <View style={{ marginVertical: 6 }}>
              <CefrMiniBar progress={p} />
            </View>
            <Text style={styles.langSub}>
              {n(p.mastered)} words · {toNextLabel(p)}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
}

/** The ladder of a language's levels with the words each needs, what counts, and what's on the way */
export function CefrSheet({ progress, onClose }: { progress: CefrProgress | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  if (!progress) return null;
  const { scale, mastered, parts } = progress;
  const top = scale.words[scale.words.length - 1];
  const barEnd = Math.max(progress.next ? progress.to : top, mastered, 1);
  // Each level's share of the bar, the surest words first
  const shown = [...MASTERY_LEVELS].reverse().filter((l) => parts[l] > 0);
  const filled = shown.reduce((sum, l) => sum + parts[l], 0) / barEnd;
  const reachedIndex = CEFR_LEVELS.indexOf(progress.level as never);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 48) + 16 }]} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {getFlagForLanguage(progress.language)} {languageName(progress.language)} vocabulary
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.big}>
              <Text style={styles.bigLevel}>{progress.level}</Text>
              <Text style={styles.bigText}>
                <Text style={styles.cardStrong}>{n(mastered)}</Text> words known{'\n'}
                {progress.next ? `${n(progress.to - mastered)} more to reach ${progress.next}` : 'The top level'}
              </Text>
            </View>
            <View style={styles.sheetBar}>
              {shown.map((l) => (
                <View key={l} style={{ flex: parts[l] / barEnd, backgroundColor: getMasteryLevelColor(l) }} />
              ))}
              <View style={{ flex: Math.max(0, 1 - filled) }} />
            </View>
            <View style={styles.legend}>
              {[...MASTERY_LEVELS].reverse().map((l) => (
                <Text key={l} style={styles.legendText}>
                  <Text style={{ color: getMasteryLevelColor(l) }}>●</Text> {l} ×{LEVEL_WEIGHTS[l]}
                </Text>
              ))}
            </View>
            {CEFR_LEVELS.map((level, i) => {
              const reached = i <= reachedIndex;
              const current = i === reachedIndex + 1;
              return (
                <View key={level} style={[styles.rung, i === CEFR_LEVELS.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={[styles.rungLevel, reached && styles.rungReached, !reached && !current && styles.rungFuture]}>{level}</Text>
                  {reached && <Ionicons name="checkmark" size={16} color={Colors.primaryLight} />}
                  {current && (
                    <View style={styles.rungBar}>
                      <CefrMiniBar progress={progress} height={6} />
                    </View>
                  )}
                  <Text style={[styles.rungWords, !reached && !current && styles.rungFuture]}>{n(scale.words[i])}</Text>
                </View>
              );
            })}
            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.noteText}>
                A rough estimate from vocabulary only, not grammar, listening or speaking. Each word counts by its level's
                weight above; forms count once with their word, and phrases and ignored words don't count. {scale.source}.
              </Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(108,92,231,0.18)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillSmall: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  pillPre: { borderColor: Colors.border, backgroundColor: 'transparent' },
  pillText: { color: Colors.primaryLight, fontWeight: '700' },
  pillTextPre: { color: Colors.textSecondary },
  miniTrack: { backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  miniFill: { height: '100%', backgroundColor: Colors.primaryLight },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 7,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: Colors.white },
  card: {
    marginHorizontal: 4,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardText: { fontSize: 13, color: Colors.textSecondary, flexShrink: 1, marginRight: 'auto' },
  cardStrong: { fontSize: 13, color: Colors.text, fontWeight: '700' },
  ladder: { flexDirection: 'row', gap: 3, marginTop: 9 },
  step: {
    flex: 1,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stepDone: { backgroundColor: Colors.primary },
  stepCurrent: { borderWidth: 1.5, borderColor: Colors.primaryLight },
  stepFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(162,155,254,0.45)' },
  stepText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  stepTextOn: { color: Colors.white },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  langFlag: { fontSize: 20 },
  langTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  langName: { fontSize: 14, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  langSub: { fontSize: 12, color: Colors.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  big: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 10 },
  bigLevel: { fontSize: 40, fontWeight: '700', color: Colors.primaryLight },
  bigText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, flex: 1 },
  sheetBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.surfaceLight },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2, marginTop: 6, marginBottom: 6 },
  legendText: { fontSize: 12, color: Colors.textSecondary },
  rung: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rungLevel: { width: 30, fontSize: 14, fontWeight: '700', color: Colors.text },
  rungReached: { color: Colors.primaryLight },
  rungFuture: { color: Colors.textMuted },
  rungBar: { flex: 1, justifyContent: 'center' },
  rungWords: { marginLeft: 'auto', fontSize: 13, color: Colors.textSecondary },
  note: { flexDirection: 'row', gap: 6, marginTop: 10 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
});
