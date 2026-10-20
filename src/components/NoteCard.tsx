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
  labelContainer: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
