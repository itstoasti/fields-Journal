import React from 'react';
import { View, Image, StyleSheet, Pressable, ViewStyle, Platform } from 'react-native';
import { TypewriterText } from './TypewriterText';
import { colors, fonts, fontSizes, spacing } from '../theme';
import { Note } from '../types';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  style?: ViewStyle;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onPress, style }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.imageContainer}>
        {Platform.OS === 'web' ? (
          <img
            src={note.posterUri || note.sourceUri}
            alt={note.place || 'Travel note'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <Image
            source={{ uri: note.posterUri || note.sourceUri }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        
        {/* Mini Multi-Color Rubber Stamp Overlay in Bottom Right (1:1 with mockup) */}
        <View style={styles.stampOverlay}>
          <Image
            source={require('../../assets/empty-stamp.png')}
            style={styles.stampImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.labelContainer}>
        <TypewriterText size="sm" bold color={colors.charcoal} numberOfLines={1}>
          {note.place || 'Observation'}
        </TypewriterText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.paperCard,
    borderRadius: 14,
    padding: 8,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: spacing.md,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.paperDark,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  stampOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 38,
    height: 38,
    backgroundColor: 'rgba(244, 239, 230, 0.92)',
    borderRadius: 8,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stampImage: {
    width: '100%',
    height: '100%',
  },
  labelContainer: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
