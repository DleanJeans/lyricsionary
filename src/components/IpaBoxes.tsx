import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './Text';
import { Colors } from '../constants/theme';
import { splitIpas } from '../utils/ipaList';

interface IpaBoxesProps {
  /** The word's IPAs as saved, separated by commas */
  value: string;
  onChange: (value: string) => void;
  /** A spinner in the first box while the IPA is searched for */
  loading?: boolean;
}

const join = (boxes: string[]) => boxes.map((ipa) => ipa.trim()).filter(Boolean).join(', ');

/**
 * A word's pronunciation with each IPA in its own box: X removes one, Add IPA opens an empty one.
 * They are still saved as one comma-separated string, so a comma typed in a box starts a new box.
 */
export default function IpaBoxes({ value, onChange, loading }: IpaBoxesProps) {
  const [boxes, setBoxes] = useState<string[]>(() => {
    const ipas = splitIpas(value);
    return ipas.length > 0 ? ipas : [''];
  });
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const lastSent = useRef(value);

  // Take in IPAs set from outside, e.g. a suggestion added or another word opened
  useEffect(() => {
    if (value === lastSent.current) return;
    lastSent.current = value;
    setBoxes((current) => {
      if (join(current) === value) return current;
      const ipas = splitIpas(value);
      return ipas.length > 0 ? ipas : [''];
    });
  }, [value]);

  const update = (next: string[]) => {
    const kept = next.length > 0 ? next : [''];
    setBoxes(kept);
    const joined = join(kept);
    lastSent.current = joined;
    if (joined !== value) onChange(joined);
  };

  const changeBox = (index: number, typed: string) => {
    // A comma (or a pasted list) splits into more boxes
    const parts = typed.split(/\s*,\s*/);
    const next = [...boxes.slice(0, index), ...parts, ...boxes.slice(index + 1)];
    if (parts.length > 1) setFocusIndex(index + parts.length - 1);
    update(next);
  };

  const removeBox = (index: number) => {
    update(boxes.filter((_, i) => i !== index));
  };

  const addBox = () => {
    setFocusIndex(boxes.length);
    setBoxes([...boxes, '']);
  };

  const canAdd = boxes.every((ipa) => ipa.trim());

  return (
    <View style={styles.stack}>
      {boxes.map((ipa, index) => (
        <View key={index} style={[styles.box, focusIndex === index && styles.boxFocused]}>
          <TextInput
            style={styles.input}
            value={ipa}
            onChangeText={(typed) => changeBox(index, typed)}
            placeholder={index === 0 ? 'e.g., /prəˌnʌnsiˈeɪʃən/' : 'Another IPA'}
            placeholderTextColor={Colors.textMuted}
            autoFocus={focusIndex === index && index > 0}
            onFocus={() => setFocusIndex(index)}
            onBlur={() => {
              setFocusIndex((current) => (current === index ? null : current));
              // An emptied box other than the only one goes away
              if (!ipa.trim() && boxes.length > 1) removeBox(index);
            }}
            accessibilityLabel={index === 0 ? 'IPA' : `IPA ${index + 1}`}
          />
          {index === 0 && loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.trailing} />
          ) : (ipa || boxes.length > 1) ? (
            <TouchableOpacity
              style={styles.trailing}
              onPress={() => removeBox(index)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={ipa ? `Remove IPA ${ipa}` : 'Remove this IPA box'}
            >
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
      {canAdd && (
        <TouchableOpacity style={styles.addBox} onPress={addBox} accessibilityRole="button" accessibilityLabel="Add another IPA">
          <Ionicons name="add" size={18} color={Colors.primaryLight} />
          <Text style={styles.addText}>Add IPA</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  boxFocused: {
    borderColor: Colors.secondary,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  trailing: {
    paddingHorizontal: 14,
  },
  addBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
});
