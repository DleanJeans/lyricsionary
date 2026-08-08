import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import WordSenseCard from './WordSenseCard';

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
  onUpdateWordSense: (index: number, field: keyof WordSenseData, value: string | number) => void;
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
  onUpdateWordSense,
  onEmojiPress,
  onRemoveWordSense,
  onUndoRemove,
}: WordSenseListProps) {
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
      {items.map((item, position) => {
        const showDivider = totalSlots > 1 && position > 0;

        if (item.type === 'removed') {
          return (
            <View
              key="removed"
              style={styles.wordSenseWrapper}
            >
              {showDivider && <View style={styles.contextDivider} />}
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
            {showDivider && <View style={styles.contextDivider} />}
            <WordSenseCard
              context={block.context}
              onContextChange={(value) => onUpdateWordSense(currentSenseIndex, 'context', value)}
              emoji={block.emoji}
              onEmojiPress={() => onEmojiPress(currentSenseIndex)}
              ipa={block.ipa}
              onIpaChange={(value) => onUpdateWordSense(currentSenseIndex, 'ipa', value)}
              ipaPlaceholder={ipaPlaceholder}
              definition={block.definition}
              onDefinitionChange={(value) => onUpdateWordSense(currentSenseIndex, 'definition', value)}
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
            />
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  wordSenseWrapper: {
    gap: 0,
  },
  contextDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 8,
    marginTop: -8,
  },
});
