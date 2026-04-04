import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { WIDE_BREAKPOINT, SIDE_NAV_WIDTH } from '../hooks/useLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_META: Record<string, { icon: IoniconName; iconFocused: IoniconName; label: string }> = {
  Editor:  { icon: 'create-outline',         iconFocused: 'create',         label: 'Editor'  },
  Web:     { icon: 'globe-outline',           iconFocused: 'globe',          label: 'Web'     },
  Learn:   { icon: 'school-outline',          iconFocused: 'school',         label: 'Learn'   },
  Lyrics:  { icon: 'musical-notes-outline',   iconFocused: 'musical-notes',  label: 'Lyrics'  },
  Words:   { icon: 'book-outline',            iconFocused: 'book',           label: 'Words'   },
};

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = width >= WIDE_BREAKPOINT;

  const handlePress = (routeName: string, routeKey: string, focused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  /* ─── Wide: left sidebar ─────────────────────────────────────── */
  if (isWide) {
    return (
      <View style={styles.sidebar}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Ionicons name="musical-notes" size={26} color={Colors.primary} />
          <Text style={styles.appName}>Lyricsionary</Text>
        </View>

        <View style={styles.divider} />

        {/* Nav items */}
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = index === state.index;
          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.sideItem, focused && styles.sideItemActive]}
              onPress={() => handlePress(route.name, route.key, focused)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={focused ? meta.iconFocused : meta.icon}
                size={20}
                color={focused ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.sideLabel, focused && styles.sideLabelActive]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  /* ─── Narrow: bottom bar ─────────────────────────────────────── */
  return (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 8 }]}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const focused = index === state.index;
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.bottomItem}
            onPress={() => handlePress(route.name, route.key, focused)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={focused ? meta.iconFocused : meta.icon}
              size={22}
              color={focused ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.bottomLabel, focused && styles.bottomLabelActive]}>
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /* Sidebar */
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDE_NAV_WIDTH,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingTop: 28,
    paddingHorizontal: 12,
    zIndex: 100,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
    marginBottom: 4,
  },
  sideItemActive: {
    backgroundColor: `${Colors.primary}22`,
  },
  sideLabel: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  sideLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },

  /* Bottom bar */
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  bottomLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  bottomLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
