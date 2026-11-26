import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { LANGUAGES, isSameLanguage } from '../constants/languages';
import { Text } from './Text';

/** A small pill with a language's code, e.g. FR, so a word like que tells which language it's in */
export default function LanguagePill({ language }: { language?: string }) {
  if (!language || language === 'unknown') return null;
  const known = LANGUAGES.find((l) => isSameLanguage(l.name, language) || l.code === language.toLowerCase());
  const code = (known?.code ?? language.slice(0, 2)).toUpperCase();
  return (
    <View style={styles.pill} accessibilityLabel={`Language: ${known?.name ?? language}`}>
      <Ionicons name="globe-outline" size={11} color={Colors.textSecondary} />
      <Text style={styles.text}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: Colors.surface },
  text: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.4 },
});
