import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

interface PhotoTapeProps {
  uri: string;
  aspectRatio?: number;
  style?: ViewStyle;
}

export const PhotoTape: React.FC<PhotoTapeProps> = ({
  uri,
  aspectRatio = 4 / 3,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* 4 Diagonal Translucent Masking Tape Strips (1:1 with mockup) */}
      <View style={[styles.tapeStrip, styles.tapeTopLeft]} />
      <View style={[styles.tapeStrip, styles.tapeTopRight]} />
      <View style={[styles.tapeStrip, styles.tapeBottomLeft]} />
      <View style={[styles.tapeStrip, styles.tapeBottomRight]} />

      {/* Photo Frame Container with White Matting */}
      <View style={styles.photoFrame}>
        <Image
          source={{ uri }}
          style={[styles.image, { aspectRatio }]}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  photoFrame: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 2,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    width: '100%',
  },
  image: {
    width: '100%',
    borderRadius: 1,
    backgroundColor: colors.paperDark,
  },
  tapeStrip: {
    position: 'absolute',
    width: 60,
    height: 22,
    backgroundColor: colors.tape,
    borderColor: colors.tapeBorder,
    borderWidth: 0.5,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 4,
  },
  tapeTopLeft: {
    top: 4,
    left: 4,
    transform: [{ rotate: '-35deg' }],
  },
  tapeTopRight: {
    top: 4,
    right: 4,
    transform: [{ rotate: '35deg' }],
  },
  tapeBottomLeft: {
    bottom: 4,
    left: 4,
    transform: [{ rotate: '35deg' }],
  },
  tapeBottomRight: {
    bottom: 4,
    right: 4,
    transform: [{ rotate: '-35deg' }],
  },
});
