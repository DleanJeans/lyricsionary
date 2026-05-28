import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  TextProps,
  TextInputProps,
  TextStyle,
} from 'react-native';

const DEFAULT_FONT_SIZE = 14;
const BOLD_WEIGHTS = ['700', '800', '900', 'bold'];

function getFontFamily(flatStyle: TextStyle | undefined): string | undefined {
  if (flatStyle?.fontFamily) return flatStyle.fontFamily;
  const weight = String(flatStyle?.fontWeight ?? '');
  if (BOLD_WEIGHTS.includes(weight)) return 'GoogleSans-Bold';
  return 'GoogleSans';
}

function defaultFont(flatStyle: TextStyle | undefined) {
  const fontSize = flatStyle?.fontSize ?? DEFAULT_FONT_SIZE;
  const fontFamily = getFontFamily(flatStyle);
  return {
    fontFamily,
    fontSize,
    fontWeight: undefined,
    includeFontPadding: false,
  };
}

function Text(props: TextProps) {
  const flatStyle = StyleSheet.flatten(props.style) as TextStyle | undefined;

  return (
    <RNText
      {...props}
      style={[props.style, defaultFont(flatStyle)]}
    />
  );
}

const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const flatStyle = StyleSheet.flatten(props.style) as TextStyle | undefined;

  return (
    <RNTextInput
      {...props}
      ref={ref}
      style={[props.style, defaultFont(flatStyle)]}
    />
  );
});

export { Text, TextInput };
