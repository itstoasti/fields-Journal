import React from 'react';
import { Text, TextStyle, StyleSheet, TextProps } from 'react-native';
import { colors, fonts, fontSizes } from '../theme';

interface TypewriterTextProps extends TextProps {
  children: React.ReactNode;
  size?: keyof typeof fontSizes;
  color?: string;
  style?: TextStyle | TextStyle[];
  bold?: boolean;
  letterSpacing?: number;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  children,
  size = 'base',
  color = colors.charcoal,
  style,
  bold = false,
  letterSpacing = 1.2,
  ...props
}) => {
  return (
    <Text
      style={[
        styles.text,
        {
          fontSize: fontSizes[size],
          color,
          letterSpacing,
          fontWeight: bold ? '700' : '400',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.mono,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
