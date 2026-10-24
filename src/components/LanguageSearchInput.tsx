import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { TextInput } from './Text';

interface LanguageSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

// Search field at the top of the language pickers
export default function LanguageSearchInput({ value, onChangeText }: LanguageSearchInputProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={Colors.textMuted} />
      <TextInput
        style={styles.input}
        placeholder="Search languages"
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search languages"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
  },
});
