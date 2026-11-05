import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import WordSenseCard from './WordSenseCard';
import { useStore } from '../store/useStore';
import type { WiktionaryDefinition } from '../utils/wiktionary';
import type { PartOfSpeech } from '../utils/partOfSpeech';

export interface WordSenseData {
  uid: number;
  context: string;
  emoji: string;
  ipa: string;
  definition: string;
  songId?: string;
  songName?: string;
  translation?: string;
  fromSong?: boolean;
  occurrence?: number;
  // Where the definition was picked in the translation
  definitionAt?: number;
  // The saved or chosen word type; left out, it's found from the definition when saving
  partOfSpeech?: PartOfSpeech;
  isNew?: boolean;
}

interface WordSenseListProps {
  wordSenses: WordSenseData[];
  undoData: {
    block: WordSenseData;
    index: number;
  } | null;
  displayWord?: string;
  songName?: string;
  artistName?: string;
  ipaPlaceholder: string;
  isNewWord: boolean;
  definitionSuggestions?: WiktionaryDefinition[];
  onUpdateWordSense: (index: number, field: keyof WordSenseData, value: string | number, at?: number) => void;
  onEmojiPress: (index: number) => void;
  onRemoveWordSense: (index: number) => void;
  onUndoRemove: () => void;
}

type SenseListItem =
  | {
      type: 'sense';
      block: WordSenseData;
      senseIndex: number;
    }
  | {
      type: 'removed';
      block: WordSenseData;
    };

export default function WordSenseList({
  wordSenses,
  undoData,
  displayWord,
  songName,
  artistName,
  ipaPlaceholder,
  isNewWord,
  definitionSuggestions,
  onUpdateWordSense,
  onEmojiPress,
  onRemoveWordSense,
  onUndoRemove,
}: WordSenseListProps) {
  const songs = useStore((s) => s.songs);
  const songsById = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);
  const songOf = (block: WordSenseData) => {
    const song = block.songId ? songsById.get(block.songId) : undefined;
    return {
      song,
      songTitle: song?.songName ?? block.songName ?? (block.songId ? songName : undefined),
      songArtist: song ? song.artistName : block.songId ? artistName : undefined,
    };
  };

  // One context is open at a time, so its Wiktionary suggestions show once; the others fold
  const [openUid, setOpenUid] = useState<number | null>(null);
  const shownOpenUid = wordSenses.some((b) => b.uid === openUid)
    ? openUid
    : (wordSenses.find((b) => b.isNew) ?? wordSenses[0])?.uid;
  // Open a context as soon as it's added
  const previousCount = useRef(wordSenses.length);
  useEffect(() => {
    const last = wordSenses[wordSenses.length - 1];
    if (wordSenses.length > previousCount.current && last?.isNew) setOpenUid(last.uid);
    previousCount.current = wordSenses.length;
  }, [wordSenses]);

  const items: SenseListItem[] = [];
  let senseIndex = 0;
  const totalSlots = wordSenses.length + (undoData ? 1 : 0);
  const removedPosition = undoData ? undoData.index : -1;

  for (let position = 0; position < totalSlots; position++) {
    if (position === removedPosition && undoData) {
      items.push({
        type: 'removed',
        block: undoData.block,
      });
    } else {
      items.push({
        type: 'sense',
        block: wordSenses[senseIndex],
        senseIndex,
      });
      senseIndex++;
    }
  }

  return (
    <>
      {items.map((item) => {

        if (item.type === 'removed') {
          return (
            <View
              key="removed"
              style={styles.wordSenseWrapper}
            >
              <WordSenseCard
                context={item.block.context}
                onContextChange={() => {}}
                emoji={item.block.emoji}
                onEmojiPress={() => {}}
                ipa={item.block.ipa}
                onIpaChange={() => {}}
                ipaPlaceholder={ipaPlaceholder}
                definition={item.block.definition}
                onDefinitionChange={() => {}}
                onUndoRemove={onUndoRemove}
                word={displayWord}
                occurrence={item.block.occurrence}
                translation={item.block.translation}
                fromSong={item.block.fromSong}
                songName={songName}
                artistName={artistName}
                {...songOf(item.block)}
                isRemoved
              />
            </View>
          );
        }

        const { block, senseIndex: currentSenseIndex } = item;
        return (
          <View
            key={block.uid}
            style={styles.wordSenseWrapper}
          >
            <WordSenseCard
              context={block.context}
              onContextChange={(value) => onUpdateWordSense(currentSenseIndex, 'context', value)}
              emoji={block.emoji}
              onEmojiPress={() => onEmojiPress(currentSenseIndex)}
              onEmojiChange={(value) => onUpdateWordSense(currentSenseIndex, 'emoji', value)}
              ipa={block.ipa}
              onIpaChange={(value) => onUpdateWordSense(currentSenseIndex, 'ipa', value)}
              ipaPlaceholder={ipaPlaceholder}
              definition={block.definition}
              onDefinitionChange={(value, at) => onUpdateWordSense(currentSenseIndex, 'definition', value, at)}
              definitionAt={block.definitionAt}
              definitionSuggestions={definitionSuggestions}
              partOfSpeech={block.partOfSpeech}
              onPartOfSpeechChange={(value) => onUpdateWordSense(currentSenseIndex, 'partOfSpeech', value)}
              onRemove={wordSenses.length > 1 ? () => onRemoveWordSense(currentSenseIndex) : undefined}
              word={displayWord}
              occurrence={block.occurrence}
              onOccurrenceChange={
                isNewWord || !block.fromSong
                  ? (value) => onUpdateWordSense(currentSenseIndex, 'occurrence', value)
                  : undefined
              }
              translation={block.translation}
              fromSong={block.fromSong}
              songName={songName}
              artistName={artistName}
              isNew={!!block.isNew}
              {...songOf(block)}
              expanded={wordSenses.length === 1 || block.uid === shownOpenUid}
              onExpand={wordSenses.length > 1 ? () => setOpenUid(block.uid) : undefined}
            />
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  wordSenseWrapper: {
    marginBottom: 4,
  },
});
