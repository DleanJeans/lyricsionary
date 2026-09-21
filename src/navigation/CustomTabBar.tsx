import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import VersionInfo from '../components/VersionInfo';
import { Colors } from '../constants/theme';
import { SIDE_NAV_WIDTH, WIDE_BREAKPOINT } from '../hooks/useLayout';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_META: Record<
  string,
  {
    icon: IoniconName;
    iconFocused: IoniconName;
    label: string;
  }
> = {
  Editor: {
    icon: 'create-outline',
    iconFocused: 'create',
    label: 'Editor',
  },
  Web: {
    icon: 'globe-outline',
    iconFocused: 'globe',
    label: 'Web',
  },
  Learn: {
    icon: 'school-outline',
    iconFocused: 'school',
    label: 'Learn',
  },
  Songs: {
    icon: 'musical-notes-outline',
    iconFocused: 'musical-notes',
    label: 'Songs',
  },
  Words: {
    icon: 'book-outline',
    iconFocused: 'book',
    label: 'Words',
  },
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
      <View
        style={[
          styles.sidebar,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <Ionicons
            name="musical-notes"
            size={26}
            color={Colors.primary}
          />
          <Text style={styles.appName}>Lyricsionary</Text>
        </View>

        <View style={styles.divider} />

        {/* Nav items */}
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = index === state.index;
          return (
            <Pressable
              key={route.key}
              style={({ pressed }) => [
                styles.sideItem,
                focused && styles.sideItemActive,
                pressed && styles.itemPressed,
              ]}
              onPress={() => handlePress(route.name, route.key, focused)}
              accessibilityRole="tab"
              accessibilityLabel={meta.label}
              accessibilityHint={`Switch to ${meta.label}`}
              accessibilityState={{
                selected: focused,
              }}
            >
              <Ionicons
                name={focused ? meta.iconFocused : meta.icon}
                size={20}
                color={focused ? Colors.primary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.sideLabel,
                  focused && styles.sideLabelActive,
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Version Info at bottom */}
        <View style={styles.versionInfoContainer}>
          <View style={styles.divider} />
          <VersionInfo />
        </View>
      </View>
    );
  }

  /* ─── Narrow: bottom bar ─────────────────────────────────────── */
  return (
    <View
      style={[
        styles.bottomBar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const focused = index === state.index;
        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [
              styles.bottomItem,
              focused && styles.bottomItemActive,
              pressed && styles.itemPressed,
            ]}
            onPress={() => handlePress(route.name, route.key, focused)}
            accessibilityRole="tab"
            accessibilityLabel={meta.label}
            accessibilityHint={`Switch to ${meta.label}`}
            accessibilityState={{
              selected: focused,
            }}
          >
            <Ionicons
              name={focused ? meta.iconFocused : meta.icon}
              size={22}
              color={focused ? Colors.primary : Colors.textMuted}
            />
            <Text
              style={[
                styles.bottomLabel,
                focused && styles.bottomLabelActive,
              ]}
            >
              {meta.label}
            </Text>
          </Pressable>
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
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    gap: 12,
    marginBottom: 4,
  },
  sideItemActive: {
    backgroundColor: `${Colors.primary}22`,
    borderLeftColor: Colors.primary,
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
  versionInfoContainer: {
    marginTop: 'auto',
    paddingTop: 12,
    gap: 12,
  },

  /* Bottom bar */
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 4,
  },
  bottomItem: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 3,
  },
  bottomItemActive: {
    backgroundColor: `${Colors.primary}22`,
  },
  itemPressed: {
    opacity: 0.72,
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
