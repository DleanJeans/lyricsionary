import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import MultiLanguageSelect from './MultiLanguageSelect';

interface SongMetadataHeaderProps {
  songName: string;
  artistName: string;
  originalLanguages: string[];
  isEditing?: boolean;
  onPress?: () => void;
  onSongNameChange?: (text: string) => void;
  onArtistNameChange?: (text: string) => void;
  onLanguagesChange: (languages: string[]) => void;
  showLanguageSelect?: boolean;
}

export default function SongMetadataHeader({
  songName,
  artistName,
  originalLanguages,
  isEditing = false,
  onPress,
  onSongNameChange,
  onArtistNameChange,
  onLanguagesChange,
  showLanguageSelect = false,
}: SongMetadataHeaderProps) {
  if (isEditing) {
    return (
      <>
        <View style={styles.inputRow}>
          <Ionicons name="musical-note-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Song Name"
            placeholderTextColor={Colors.textMuted}
            value={songName}
            onChangeText={onSongNameChange}
          />
        </View>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Artist Name"
            placeholderTextColor={Colors.textMuted}
            value={artistName}
            onChangeText={onArtistNameChange}
          />
        </View>
        {showLanguageSelect && (
          <View style={[styles.inputRow, { gap: 14 }]}>
            <Ionicons name="language-outline" size={20} color={Colors.textSecondary} />
            <MultiLanguageSelect
              value={originalLanguages}
              onValueChange={onLanguagesChange}
              placeholder="Original Language(s)"
            />
          </View>
        )}
      </>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.displayContainer}>
        <View style={styles.songNameRow}>
          <Text style={styles.songName} numberOfLines={1}>
            {songName}
          </Text>
          <View style={styles.headerFlags}>
            {(originalLanguages ?? []).map((lang) => (
              <Text key={`orig-${lang}`} style={styles.flag}>
                {getFlagForLanguage(lang)}
              </Text>
            ))}
          </View>
        </View>
        <Text style={styles.artistName}>{artistName}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  displayContainer: {
    // No specific styling needed, just a wrapper
  },
  songNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  headerFlags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  flag: {
    fontSize: 14,
  },
  songName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  artistName: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 14,
    marginLeft: 10,
  },
});
