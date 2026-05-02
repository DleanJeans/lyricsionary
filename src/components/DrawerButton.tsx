import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { useIsWide } from '../hooks/useLayout';

export default function DrawerButton() {
  const navigation = useNavigation();
  const isWide = useIsWide();

  // Only show on narrow screens (drawer is not used on wide screens)
  if (isWide) {
    return null;
  }

  const handlePress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="menu" size={28} color={Colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 8,
    marginRight: 4,
  },
});
