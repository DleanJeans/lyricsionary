import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface EmojiSelectProps {
  value: string;
  onValueChange: (emoji: string) => void;
  placeholder?: string;
}

const EMOJI_LIST = [
  { emoji: '😀', label: 'Grinning Face' },
  { emoji: '😃', label: 'Grinning Face with Big Eyes' },
  { emoji: '😄', label: 'Grinning Face with Smiling Eyes' },
  { emoji: '😁', label: 'Beaming Face with Smiling Eyes' },
  { emoji: '😆', label: 'Grinning Squinting Face' },
  { emoji: '😅', label: 'Grinning Face with Sweat' },
  { emoji: '🤣', label: 'Rolling on the Floor Laughing' },
  { emoji: '😂', label: 'Face with Tears of Joy' },
  { emoji: '🙂', label: 'Slightly Smiling Face' },
  { emoji: '🙃', label: 'Upside-Down Face' },
  { emoji: '😉', label: 'Winking Face' },
  { emoji: '😊', label: 'Smiling Face with Smiling Eyes' },
  { emoji: '😇', label: 'Smiling Face with Halo' },
  { emoji: '🥰', label: 'Smiling Face with Hearts' },
  { emoji: '😍', label: 'Smiling Face with Heart-Eyes' },
  { emoji: '🤩', label: 'Star-Struck' },
  { emoji: '😘', label: 'Face Blowing a Kiss' },
  { emoji: '😗', label: 'Kissing Face' },
  { emoji: '😚', label: 'Kissing Face with Closed Eyes' },
  { emoji: '😙', label: 'Kissing Face with Smiling Eyes' },
  { emoji: '😋', label: 'Face Savoring Food' },
  { emoji: '😛', label: 'Face with Tongue' },
  { emoji: '😜', label: 'Winking Face with Tongue' },
  { emoji: '🤪', label: 'Zany Face' },
  { emoji: '😝', label: 'Squinting Face with Tongue' },
  { emoji: '🤑', label: 'Money-Mouth Face' },
  { emoji: '🤗', label: 'Hugging Face' },
  { emoji: '🤭', label: 'Face with Hand Over Mouth' },
  { emoji: '🤫', label: 'Shushing Face' },
  { emoji: '🤔', label: 'Thinking Face' },
  { emoji: '🤐', label: 'Zipper-Mouth Face' },
  { emoji: '🤨', label: 'Face with Raised Eyebrow' },
  { emoji: '😐', label: 'Neutral Face' },
  { emoji: '😑', label: 'Expressionless Face' },
  { emoji: '😶', label: 'Face Without Mouth' },
  { emoji: '😏', label: 'Smirking Face' },
  { emoji: '😒', label: 'Unamused Face' },
  { emoji: '🙄', label: 'Face with Rolling Eyes' },
  { emoji: '😬', label: 'Grimacing Face' },
  { emoji: '🤥', label: 'Lying Face' },
  { emoji: '😌', label: 'Relieved Face' },
  { emoji: '😔', label: 'Pensive Face' },
  { emoji: '😪', label: 'Sleepy Face' },
  { emoji: '🤤', label: 'Drooling Face' },
  { emoji: '😴', label: 'Sleeping Face' },
  { emoji: '😷', label: 'Face with Medical Mask' },
  { emoji: '🤒', label: 'Face with Thermometer' },
  { emoji: '🤕', label: 'Face with Head-Bandage' },
  { emoji: '🤢', label: 'Nauseated Face' },
  { emoji: '🤮', label: 'Face Vomiting' },
  { emoji: '🤧', label: 'Sneezing Face' },
  { emoji: '🥵', label: 'Hot Face' },
  { emoji: '🥶', label: 'Cold Face' },
  { emoji: '😵', label: 'Dizzy Face' },
  { emoji: '🤯', label: 'Exploding Head' },
  { emoji: '🤠', label: 'Cowboy Hat Face' },
  { emoji: '🥳', label: 'Partying Face' },
  { emoji: '😎', label: 'Smiling Face with Sunglasses' },
  { emoji: '🤓', label: 'Nerd Face' },
  { emoji: '🧐', label: 'Face with Monocle' },
  { emoji: '😕', label: 'Confused Face' },
  { emoji: '😟', label: 'Worried Face' },
  { emoji: '🙁', label: 'Slightly Frowning Face' },
  { emoji: '😮', label: 'Face with Open Mouth' },
  { emoji: '😯', label: 'Hushed Face' },
  { emoji: '😲', label: 'Astonished Face' },
  { emoji: '😳', label: 'Flushed Face' },
  { emoji: '🥺', label: 'Pleading Face' },
  { emoji: '😦', label: 'Frowning Face with Open Mouth' },
  { emoji: '😧', label: 'Anguished Face' },
  { emoji: '😨', label: 'Fearful Face' },
  { emoji: '😰', label: 'Anxious Face with Sweat' },
  { emoji: '😥', label: 'Sad but Relieved Face' },
  { emoji: '😢', label: 'Crying Face' },
  { emoji: '😭', label: 'Loudly Crying Face' },
  { emoji: '😱', label: 'Face Screaming in Fear' },
  { emoji: '😖', label: 'Confounded Face' },
  { emoji: '😣', label: 'Persevering Face' },
  { emoji: '😞', label: 'Disappointed Face' },
  { emoji: '😓', label: 'Downcast Face with Sweat' },
  { emoji: '😩', label: 'Weary Face' },
  { emoji: '😫', label: 'Tired Face' },
  { emoji: '🥱', label: 'Yawning Face' },
  { emoji: '😤', label: 'Face with Steam From Nose' },
  { emoji: '😡', label: 'Pouting Face' },
  { emoji: '😠', label: 'Angry Face' },
  { emoji: '🤬', label: 'Face with Symbols on Mouth' },
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '👎', label: 'Thumbs Down' },
  { emoji: '👌', label: 'OK Hand' },
  { emoji: '✌️', label: 'Victory Hand' },
  { emoji: '🤞', label: 'Crossed Fingers' },
  { emoji: '🤟', label: 'Love-You Gesture' },
  { emoji: '🤘', label: 'Sign of the Horns' },
  { emoji: '👋', label: 'Waving Hand' },
  { emoji: '🤚', label: 'Raised Back of Hand' },
  { emoji: '✋', label: 'Raised Hand' },
  { emoji: '🖖', label: 'Vulcan Salute' },
  { emoji: '👏', label: 'Clapping Hands' },
  { emoji: '🙌', label: 'Raising Hands' },
  { emoji: '🤲', label: 'Palms Up Together' },
  { emoji: '🤝', label: 'Handshake' },
  { emoji: '🙏', label: 'Folded Hands' },
  { emoji: '💪', label: 'Flexed Biceps' },
  { emoji: '❤️', label: 'Red Heart' },
  { emoji: '🧡', label: 'Orange Heart' },
  { emoji: '💛', label: 'Yellow Heart' },
  { emoji: '💚', label: 'Green Heart' },
  { emoji: '💙', label: 'Blue Heart' },
  { emoji: '💜', label: 'Purple Heart' },
  { emoji: '🖤', label: 'Black Heart' },
  { emoji: '🤍', label: 'White Heart' },
  { emoji: '🤎', label: 'Brown Heart' },
  { emoji: '💔', label: 'Broken Heart' },
  { emoji: '❣️', label: 'Heart Exclamation' },
  { emoji: '💕', label: 'Two Hearts' },
  { emoji: '💞', label: 'Revolving Hearts' },
  { emoji: '💓', label: 'Beating Heart' },
  { emoji: '💗', label: 'Growing Heart' },
  { emoji: '💖', label: 'Sparkling Heart' },
  { emoji: '💘', label: 'Heart with Arrow' },
  { emoji: '💝', label: 'Heart with Ribbon' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '🌟', label: 'Glowing Star' },
  { emoji: '✨', label: 'Sparkles' },
  { emoji: '💫', label: 'Dizzy' },
  { emoji: '💥', label: 'Collision' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '⚡', label: 'High Voltage' },
  { emoji: '☀️', label: 'Sun' },
  { emoji: '🌙', label: 'Crescent Moon' },
  { emoji: '⭐', label: 'White Medium Star' },
  { emoji: '🌈', label: 'Rainbow' },
  { emoji: '☁️', label: 'Cloud' },
  { emoji: '⛅', label: 'Sun Behind Cloud' },
  { emoji: '🌤️', label: 'Sun Behind Small Cloud' },
  { emoji: '⛈️', label: 'Cloud with Lightning and Rain' },
  { emoji: '🌧️', label: 'Cloud with Rain' },
  { emoji: '⚡', label: 'Lightning' },
  { emoji: '❄️', label: 'Snowflake' },
  { emoji: '⛄', label: 'Snowman' },
  { emoji: '☃️', label: 'Snowman' },
  { emoji: '🎃', label: 'Jack-O-Lantern' },
  { emoji: '🎄', label: 'Christmas Tree' },
  { emoji: '🎁', label: 'Wrapped Gift' },
  { emoji: '🎈', label: 'Balloon' },
  { emoji: '🎉', label: 'Party Popper' },
  { emoji: '🎊', label: 'Confetti Ball' },
  { emoji: '🎂', label: 'Birthday Cake' },
  { emoji: '🎵', label: 'Musical Note' },
  { emoji: '🎶', label: 'Musical Notes' },
  { emoji: '🎤', label: 'Microphone' },
  { emoji: '🎧', label: 'Headphone' },
  { emoji: '🎸', label: 'Guitar' },
  { emoji: '🎹', label: 'Musical Keyboard' },
  { emoji: '🎺', label: 'Trumpet' },
  { emoji: '🎻', label: 'Violin' },
  { emoji: '🥁', label: 'Drum' },
  { emoji: '📚', label: 'Books' },
  { emoji: '📖', label: 'Open Book' },
  { emoji: '📝', label: 'Memo' },
  { emoji: '✏️', label: 'Pencil' },
  { emoji: '✒️', label: 'Black Nib' },
  { emoji: '🖊️', label: 'Pen' },
  { emoji: '🖍️', label: 'Crayon' },
  { emoji: '📌', label: 'Pushpin' },
  { emoji: '📍', label: 'Round Pushpin' },
  { emoji: '🎯', label: 'Direct Hit' },
  { emoji: '🏆', label: 'Trophy' },
  { emoji: '🥇', label: 'First Place Medal' },
  { emoji: '🥈', label: 'Second Place Medal' },
  { emoji: '🥉', label: 'Third Place Medal' },
  { emoji: '🏅', label: 'Sports Medal' },
  { emoji: '🎖️', label: 'Military Medal' },
  { emoji: '🏵️', label: 'Rosette' },
  { emoji: '🎗️', label: 'Reminder Ribbon' },
  { emoji: '🍎', label: 'Red Apple' },
  { emoji: '🍌', label: 'Banana' },
  { emoji: '🍊', label: 'Tangerine' },
  { emoji: '🍉', label: 'Watermelon' },
  { emoji: '🍇', label: 'Grapes' },
  { emoji: '🍓', label: 'Strawberry' },
  { emoji: '🫐', label: 'Blueberries' },
  { emoji: '🍒', label: 'Cherries' },
  { emoji: '🍑', label: 'Peach' },
  { emoji: '🥭', label: 'Mango' },
  { emoji: '🍍', label: 'Pineapple' },
  { emoji: '🥥', label: 'Coconut' },
  { emoji: '🥝', label: 'Kiwi Fruit' },
  { emoji: '🍅', label: 'Tomato' },
  { emoji: '🥑', label: 'Avocado' },
  { emoji: '🍆', label: 'Eggplant' },
  { emoji: '🥔', label: 'Potato' },
  { emoji: '🥕', label: 'Carrot' },
  { emoji: '🌽', label: 'Ear of Corn' },
  { emoji: '🌶️', label: 'Hot Pepper' },
  { emoji: '🥒', label: 'Cucumber' },
  { emoji: '🥬', label: 'Leafy Green' },
  { emoji: '🥦', label: 'Broccoli' },
  { emoji: '🧄', label: 'Garlic' },
  { emoji: '🧅', label: 'Onion' },
  { emoji: '🍄', label: 'Mushroom' },
  { emoji: '🥜', label: 'Peanuts' },
  { emoji: '🌰', label: 'Chestnut' },
  { emoji: '🍞', label: 'Bread' },
  { emoji: '🥐', label: 'Croissant' },
  { emoji: '🥖', label: 'Baguette Bread' },
  { emoji: '🥨', label: 'Pretzel' },
  { emoji: '🥯', label: 'Bagel' },
  { emoji: '🥞', label: 'Pancakes' },
  { emoji: '🧇', label: 'Waffle' },
  { emoji: '🧀', label: 'Cheese Wedge' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🍔', label: 'Hamburger' },
  { emoji: '🍟', label: 'French Fries' },
  { emoji: '🌭', label: 'Hot Dog' },
  { emoji: '🥪', label: 'Sandwich' },
  { emoji: '🌮', label: 'Taco' },
  { emoji: '🌯', label: 'Burrito' },
  { emoji: '🥙', label: 'Stuffed Flatbread' },
  { emoji: '🧆', label: 'Falafel' },
  { emoji: '🥚', label: 'Egg' },
  { emoji: '🍳', label: 'Cooking' },
  { emoji: '🥓', label: 'Bacon' },
  { emoji: '🥩', label: 'Cut of Meat' },
  { emoji: '🍗', label: 'Poultry Leg' },
  { emoji: '🍖', label: 'Meat on Bone' },
  { emoji: '⚽', label: 'Soccer Ball' },
  { emoji: '🏀', label: 'Basketball' },
  { emoji: '🏈', label: 'American Football' },
  { emoji: '⚾', label: 'Baseball' },
  { emoji: '🥎', label: 'Softball' },
  { emoji: '🎾', label: 'Tennis' },
  { emoji: '🏐', label: 'Volleyball' },
  { emoji: '🏉', label: 'Rugby Football' },
  { emoji: '🥏', label: 'Flying Disc' },
  { emoji: '🎱', label: 'Pool 8 Ball' },
  { emoji: '🏓', label: 'Ping Pong' },
  { emoji: '🏸', label: 'Badminton' },
  { emoji: '🏒', label: 'Ice Hockey' },
  { emoji: '🏑', label: 'Field Hockey' },
  { emoji: '🥍', label: 'Lacrosse' },
  { emoji: '🏏', label: 'Cricket Game' },
  { emoji: '🥅', label: 'Goal Net' },
  { emoji: '⛳', label: 'Flag in Hole' },
  { emoji: '🏹', label: 'Bow and Arrow' },
  { emoji: '🎣', label: 'Fishing Pole' },
  { emoji: '🥊', label: 'Boxing Glove' },
  { emoji: '🥋', label: 'Martial Arts Uniform' },
  { emoji: '🎿', label: 'Skis' },
  { emoji: '⛷️', label: 'Skier' },
  { emoji: '🏂', label: 'Snowboarder' },
  { emoji: '🏋️', label: 'Person Lifting Weights' },
  { emoji: '🤺', label: 'Person Fencing' },
  { emoji: '🤼', label: 'People Wrestling' },
  { emoji: '🤸', label: 'Person Cartwheeling' },
  { emoji: '🤾', label: 'Person Playing Handball' },
  { emoji: '🤽', label: 'Person Playing Water Polo' },
  { emoji: '🧘', label: 'Person in Lotus Position' },
  { emoji: '🚗', label: 'Automobile' },
  { emoji: '🚕', label: 'Taxi' },
  { emoji: '🚙', label: 'Sport Utility Vehicle' },
  { emoji: '🚌', label: 'Bus' },
  { emoji: '🚎', label: 'Trolleybus' },
  { emoji: '🚐', label: 'Minibus' },
  { emoji: '🚑', label: 'Ambulance' },
  { emoji: '🚒', label: 'Fire Engine' },
  { emoji: '🚓', label: 'Police Car' },
  { emoji: '🚔', label: 'Oncoming Police Car' },
  { emoji: '🚨', label: 'Police Car Light' },
  { emoji: '🚚', label: 'Delivery Truck' },
  { emoji: '🚛', label: 'Articulated Lorry' },
  { emoji: '🚜', label: 'Tractor' },
  { emoji: '🏎️', label: 'Racing Car' },
  { emoji: '🏍️', label: 'Motorcycle' },
  { emoji: '🛵', label: 'Motor Scooter' },
  { emoji: '🚲', label: 'Bicycle' },
  { emoji: '🛴', label: 'Kick Scooter' },
  { emoji: '✈️', label: 'Airplane' },
  { emoji: '🚁', label: 'Helicopter' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '🛸', label: 'Flying Saucer' },
  { emoji: '⛵', label: 'Sailboat' },
  { emoji: '🚤', label: 'Speedboat' },
  { emoji: '⛴️', label: 'Ferry' },
  { emoji: '🛳️', label: 'Passenger Ship' },
  { emoji: '🚢', label: 'Ship' },
];

export default function EmojiSelect({ value, onValueChange, placeholder = 'Select Emoji' }: EmojiSelectProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(value);

  const handleSelect = () => {
    onValueChange(selectedEmoji);
    setShowModal(false);
  };

  const displayText = value || placeholder;

  return (
    <>
      <TouchableOpacity style={styles.selectButton} onPress={() => setShowModal(true)}>
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Emoji</Text>
            <FlatList
              data={EMOJI_LIST}
              keyExtractor={(item) => item.emoji}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedEmoji === item.emoji && styles.modalItemSelected,
                  ]}
                  onPress={() => setSelectedEmoji(item.emoji)}
                >
                  <Text style={styles.modalItemEmoji}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedEmoji === item.emoji && styles.modalItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selectedEmoji === item.emoji && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              numColumns={3}
              columnWrapperStyle={styles.modalRow}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAdd} onPress={handleSelect}>
                <Text style={styles.modalAddText}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectText: {
    fontSize: 24,
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 400,
  },
  modalRow: {
    justifyContent: 'space-between',
  },
  modalItem: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    flex: 1,
  },
  modalItemSelected: {
    backgroundColor: Colors.surfaceLight,
  },
  modalItemEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  modalItemText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalItemTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalAdd: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalAddText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
