import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';

interface WordLookupButtonsProps {
  word: string;
  songId?: string;
  songName?: string;
  lyricsLine?: string;
  artistName?: string;
  originalLanguages?: string[];
}

export default function WordLookupButtons({ word, songId, songName, artistName, lyricsLine, originalLanguages }: WordLookupButtonsProps) {
  const navigation = useNavigation<any>();

  const handleLookup = () => {
    navigation.navigate('WordLookup', { word, songId, songName, artistName, lyricsLine, originalLanguages });
  };

  return (
    <View style={styles.wordActions}>
      <TouchableOpacity style={styles.wordBtn} onPress={handleLookup}>
        <Ionicons name="logo-google" size={18} color={Colors.white} />
        <Text style={styles.wordBtnText}>Google</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.wordBtn} onPress={handleLookup}>
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
