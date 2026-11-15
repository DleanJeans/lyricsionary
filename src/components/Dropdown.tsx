import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import { Colors } from '../constants/theme';
import { Text } from './Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface DropdownProps {
  /** Before the label: an icon name, or a node such as a flag */
  icon?: IoniconName | React.ReactNode;
  label?: string;
  /** Shows the button filled, e.g. while a filter in it is on */
  selected?: boolean;
  /** No border or fill, e.g. the language flag in the title row */
  plain?: boolean;
  accessibilityLabel: string;
  /** The menu's items; `close` closes the menu */
  children: (close: () => void) => React.ReactNode;
}

/** A small button with a ▾ that opens its menu right under it */
export default function Dropdown({ icon, label, selected = false, plain = false, accessibilityLabel, children }: DropdownProps) {
  const buttonRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const open = () =>
    buttonRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  const close = () => setAnchor(null);
  const color = selected ? Colors.white : Colors.textSecondary;
  const menuWidth = 240;
  // Lined up with the button's left edge, moved left when that would run off the screen
  const left = anchor ? Math.max(8, Math.min(anchor.x, windowWidth - menuWidth - 8)) : 0;
  const top = anchor ? anchor.y + anchor.height + 4 : 0;
  return (
    <>
      <Pressable
        ref={buttonRef}
        onPress={open}
        style={({ pressed }) => [
          plain ? styles.plainButton : styles.button,
          selected && styles.buttonSelected,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: !!anchor, selected }}
      >
        {typeof icon === 'string' ? <Ionicons name={icon as IoniconName} size={15} color={color} /> : icon}
        {!!label && (
          <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
            {label}
          </Text>
        )}
        <Ionicons name="chevron-down" size={plain ? 12 : 13} color={selected ? Colors.white : Colors.textMuted} />
      </Pressable>
      <Modal visible={!!anchor} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close} accessibilityLabel="Close menu">
          <Pressable style={[styles.menu, { top, left, width: menuWidth, maxHeight: windowHeight - top - 24 }]}>
            <ScrollView bounces={false}>{children(close)}</ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

interface MenuItemProps {
  icon?: IoniconName | React.ReactNode;
  iconColor?: string;
  label: string;
  /** Shown at the end, e.g. how many words it'd show */
  count?: number;
  checked: boolean;
  /** A check for a filter that's on or off, a dot for one choice out of a few */
  kind?: 'check' | 'radio';
  onPress: () => void;
}

export function MenuItem({ icon, iconColor = Colors.textSecondary, label, count, checked, kind = 'check', onPress }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, checked && styles.itemChecked, pressed && styles.pressed]}
      accessibilityRole={kind === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View style={styles.mark}>
        {kind === 'radio' ? (
          <Ionicons name={checked ? 'radio-button-on' : 'radio-button-off'} size={16} color={checked ? Colors.primaryLight : Colors.textMuted} />
        ) : checked ? (
          <Ionicons name="checkmark" size={17} color={Colors.primaryLight} />
        ) : null}
      </View>
      {typeof icon === 'string' ? <Ionicons name={icon as IoniconName} size={17} color={iconColor} /> : icon}
      <Text style={styles.itemLabel} numberOfLines={1}>{label}</Text>
      {count !== undefined && <Text style={styles.count}>{count}</Text>}
    </Pressable>
  );
}

export function MenuSwitch({ icon, label, value, onValueChange }: { icon: IoniconName; label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={styles.item}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
    >
      <View style={styles.mark} />
      <Ionicons name={icon} size={17} color={Colors.textSecondary} />
      <Text style={styles.itemLabel} numberOfLines={1}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.white}
      />
    </Pressable>
  );
}

export function MenuHeader({ title }: { title: string }) {
  return <Text style={styles.header}>{title}</Text>;
}

export function MenuDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 1,
    minWidth: 0,
  },
  plainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 40,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  buttonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 13,
    color: Colors.text,
    flexShrink: 1,
  },
  labelSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A58',
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  itemChecked: {
    backgroundColor: 'rgba(108,92,231,0.2)',
  },
  mark: {
    width: 18,
    alignItems: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  count: {
    fontSize: 12.5,
    color: Colors.textMuted,
  },
  header: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#3A3A58',
    marginVertical: 4,
    marginHorizontal: 6,
  },
});
