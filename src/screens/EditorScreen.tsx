import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { LANGUAGES } from '../constants/languages';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function EditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { songs, saveSong, updateSong, setCurrentSongId, setWebUrl } = useStore();

  const editSongId = route.params?.songId as string | undefined;
  const editSong = editSongId ? songs.find((s) => s.id === editSongId) : null;

  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [originalLyrics, setOriginalLyrics] = useState('');
  const [translations, setTranslations] = useState<{ language: string; lyrics: string }[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].name);

  useEffect(() => {
    if (editSong) {
      setSongName(editSong.songName);
      setArtistName(editSong.artistName);
      setOriginalLyrics(editSong.originalLyrics);
      setTranslations(editSong.translations.map((t) => ({ ...t })));
    }
  }, [editSong?.id]);

  const isEditMode = !!editSong;
  const allEmpty = !songName && !artistName && !originalLyrics && translations.every((t) => !t.lyrics);
  const searchDisabled = !songName.trim() && !artistName.trim();

  const currentLyrics = activeTab === 0 ? originalLyrics : translations[activeTab - 1]?.lyrics ?? '';
  const setCurrentLyrics = (text: string) => {
    if (activeTab === 0) {
      setOriginalLyrics(text);
    } else {
      const updated = [...translations];
      updated[activeTab - 1] = { ...updated[activeTab - 1], lyrics: text };
      setTranslations(updated);
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setCurrentLyrics(text);
  };

  const handleSave = async () => {
    if (!songName.trim()) {
      Alert.alert('Missing Info', 'Please enter a song name.');
      return;
    }
    if (isEditMode && editSong) {
      await updateSong(editSong.id, {
        songName: songName.trim(),
        artistName: artistName.trim(),
        originalLyrics,
        translations,
      });
      Alert.alert('Updated', 'Song updated successfully.');
    } else {
      const song = await saveSong(songName.trim(), artistName.trim(), originalLyrics, translations);
      setCurrentSongId(song.id);
      Alert.alert('Saved', 'Song saved successfully.');
    }
  };

  const handleClear = () => {
    setSongName('');
    setArtistName('');
    setOriginalLyrics('');
    setTranslations([]);
    setActiveTab(0);
  };

  const handleGoogleSearch = () => {
    const query = encodeURIComponent(`${songName} ${artistName} lyrics`);
    setWebUrl(`https://www.google.com/search?q=${query}`);
    navigation.navigate('Web');
  };

  const handleAddTranslation = () => {
    const alreadyAdded = translations.some((t) => t.language === selectedLanguage);
    if (alreadyAdded) {
      Alert.alert('Duplicate', `${selectedLanguage} translation already exists.`);
      return;
    }
    setTranslations([...translations, { language: selectedLanguage, lyrics: '' }]);
    setActiveTab(translations.length + 1);
    setShowAddDialog(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{isEditMode ? 'Edit Lyrics' : 'New Lyrics'}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => {/* fetch song metadata placeholder */}}>
          <Ionicons name="musical-note" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Song Info Inputs */}
      <View style={styles.inputRow}>
        <Ionicons name="musical-note-outline" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.textInput}
          placeholder="Song Name"
          placeholderTextColor={Colors.textMuted}
          value={songName}
          onChangeText={setSongName}
        />
      </View>
      <View style={styles.inputRow}>
        <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.textInput}
          placeholder="Artist Name"
          placeholderTextColor={Colors.textMuted}
          value={artistName}
          onChangeText={setArtistName}
        />
      </View>

      {/* Google Search Button */}
      <TouchableOpacity
        style={[styles.searchButton, searchDisabled && styles.disabled]}
        disabled={searchDisabled}
        onPress={handleGoogleSearch}
      >
        <Ionicons name="search" size={18} color={Colors.white} />
        <Text style={styles.searchButtonText}>Google Search</Text>
      </TouchableOpacity>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 0 && styles.tabActive]}
          onPress={() => setActiveTab(0)}
        >
          <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>Original</Text>
        </TouchableOpacity>
        {translations.map((t, i) => (
          <TouchableOpacity
            key={t.language}
            style={[styles.tab, activeTab === i + 1 && styles.tabActive]}
            onPress={() => setActiveTab(i + 1)}
          >
            <Text style={[styles.tabText, activeTab === i + 1 && styles.tabTextActive]}>{t.language}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addTab} onPress={() => setShowAddDialog(true)}>
          <Ionicons name="add" size={20} color={Colors.primary} />
          <Text style={styles.addTabText}>Add Translation</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Lyrics TextInput */}
      <View style={styles.lyricsContainer}>
        <TextInput
          style={styles.lyricsInput}
          multiline
          placeholder="Paste or type lyrics here..."
          placeholderTextColor={Colors.textMuted}
          value={currentLyrics}
          onChangeText={setCurrentLyrics}
          textAlignVertical="top"
        />
      </View>

      {/* Bottom Actions */}
      <View style={styles.actions}>
        {currentLyrics.length === 0 ? (
          <TouchableOpacity style={styles.actionButton} onPress={handlePaste}>
            <Ionicons name="clipboard-outline" size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Paste</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave}>
            <Ionicons name="checkmark" size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Save</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.clearButton, allEmpty && styles.disabled]}
          disabled={allEmpty}
          onPress={handleClear}
        >
          <Ionicons name="close" size={20} color={Colors.white} />
          <Text style={styles.actionButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Add Translation Modal */}
      <Modal visible={showAddDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Translation</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              style={styles.languageList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    selectedLanguage === item.name && styles.languageItemSelected,
                  ]}
                  onPress={() => setSelectedLanguage(item.name)}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <Text style={styles.languageName}>{item.name}</Text>
                  {selectedLanguage === item.name && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddDialog(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAdd} onPress={handleAddTranslation}>
                <Text style={styles.modalAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  iconButton: {
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
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
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
  tabBar: {
    flexGrow: 0,
    marginBottom: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.white,
  },
  addTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  addTabText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  lyricsContainer: {
    flex: 1,
    marginBottom: 10,
  },
  lyricsInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  saveButton: {
    backgroundColor: Colors.success,
  },
  clearButton: {
    backgroundColor: Colors.danger,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  languageList: {
    maxHeight: 300,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  languageItemSelected: {
    backgroundColor: Colors.surfaceLight,
  },
  languageFlag: {
    fontSize: 22,
  },
  languageName: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalAdd: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalAddText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
