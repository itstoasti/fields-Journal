import { Platform } from 'react-native';

export const fonts = {
  // Vintage Typewriter / Monospace font
  mono: Platform.select({
    ios: 'Courier-Bold',
    android: 'monospace',
    default: 'monospace',
  }),
  monoRegular: Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'monospace',
  }),
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
  wordmark: 32,
  display: 36,
};
