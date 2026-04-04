import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsWide, SIDE_NAV_WIDTH, MAX_CONTENT_WIDTH } from '../hooks/useLayout';
import { Colors } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  /** Skip the default horizontal padding (for full-bleed screens like Web) */
  noPadding?: boolean;
  /** Make this wrapper flex: 1 row so children can split horizontally */
  row?: boolean;
}

export default function ScreenWrapper({ children, noPadding, row }: Props) {
  const insets = useSafeAreaInsets();
  const isWide = useIsWide();

  const paddingTop = isWide ? 20 : Math.max(insets.top, 20) + 12;
  const paddingLeft = isWide ? SIDE_NAV_WIDTH + (noPadding ? 0 : 16) : noPadding ? 0 : 16;

  return (
    <View
      style={[
        styles.outer,
        {
          paddingTop,
          paddingLeft,
          paddingRight: noPadding ? 0 : 16,
        },
      ]}
    >
      {isWide ? (
        <View
          style={[
            styles.inner,
            row && styles.row,
            { maxWidth: MAX_CONTENT_WIDTH - SIDE_NAV_WIDTH },
          ]}
        >
          {children}
        </View>
      ) : (
        <View style={[styles.inner, row && styles.row]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
});
