import React from 'react';
import { View, Image, StyleSheet, ViewStyle, Platform } from 'react-native';
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
      <View style={[styles.tapeStrip, styles.tapeTopLeft]} pointerEvents="none" />
      <View style={[styles.tapeStrip, styles.tapeTopRight]} pointerEvents="none" />
      <View style={[styles.tapeStrip, styles.tapeBottomLeft]} pointerEvents="none" />
      <View style={[styles.tapeStrip, styles.tapeBottomRight]} pointerEvents="none" />

      {/* Photo Frame Container with White Matting */}
      <View style={styles.photoFrame}>
        {Platform.OS === 'web' ? (
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: `${(1 / aspectRatio) * 100}%`,
              overflow: 'hidden',
              borderRadius: 1,
            }}
          >
            <img
              src={uri}
              alt="Selected travel photo"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                borderRadius: 1,
              }}
            />
          </div>
        ) : (
          <Image
            source={{ uri }}
            style={[styles.image, { aspectRatio }]}
            resizeMode="cover"
          />
        )}
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
    width: '100%',
    alignSelf: 'stretch',
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
