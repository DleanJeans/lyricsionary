import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { GOOGLE_SEARCH_URL } from '../constants/urls';

interface WordLookupButtonsProps {
  word: string;
}

export default function WordLookupButtons({ word }: WordLookupButtonsProps) {
  const navigation = useNavigation<any>();
  const { setWebUrl } = useStore();

  const handleGoogleWord = () => {
    setWebUrl(`${GOOGLE_SEARCH_URL}&q=define+${encodeURIComponent(word)}`);
    navigation.navigate('Web');
  };

  const handleWiktionaryWord = () => {
    const url = `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
    setWebUrl(url);
    navigation.navigate('Web');
  };

  return (
    <View style={styles.wordActions}>
      <TouchableOpacity style={styles.wordBtn} onPress={handleGoogleWord}>
        <Ionicons name="logo-google" size={18} color={Colors.white} />
        <Text style={styles.wordBtnText}>Google</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.wordBtn} onPress={handleWiktionaryWord}>
        <Ionicons name="book-outline" size={18} color={Colors.white} />
        <Text style={styles.wordBtnText}>Wiktionary</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wordActions: {
    flexDirection: 'row',
    gap: 10,
  },
  wordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  wordBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
