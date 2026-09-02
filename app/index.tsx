import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  PaperContainer,
  TypewriterText,
  StampButton,
  NoteCard,
  StatusBadge,
} from '../src/components';
import { colors, spacing } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const notes = useAppStore((state) => state.notes);
  const entitlements = useAppStore((state) => state.entitlements);
  const syncWithBackend = useAppStore((state) => state.syncWithBackend);

  useFocusEffect(
    useCallback(() => {
      syncWithBackend();
    }, [syncWithBackend])
  );

  const handleNewNote = () => {
    router.push('/compose');
  };

  const handleOpenSettings = () => {
    router.push('/settings');
  };

  const handleOpenNote = (note: any) => {
    router.push({
      pathname: '/result',
      params: {
        noteId: note.id,
        posterUri: note.posterUri,
        place: note.place,
        number: note.number,
        year: note.year,
        keywords: JSON.stringify(note.keywords),
        fromLibrary: 'true',
      },
    });
  };

  return (
    <PaperContainer>
      {/* Top Header with Wordmark and Settings */}
      <View style={styles.header}>
        <View style={styles.settingsIconWrapper}>
          <Pressable
            onPress={handleOpenSettings}
            style={styles.settingsButton}
            accessibilityLabel="Settings"
            accessibilityRole="button"
            hitSlop={12}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.charcoal} />
          </Pressable>
        </View>

        <View style={styles.wordmarkContainer}>
          <TypewriterText size="wordmark" bold letterSpacing={3} color={colors.charcoal} style={styles.titleText}>
            FIELDS
          </TypewriterText>
          <TypewriterText size="xs" bold letterSpacing={2.5} color={colors.charcoal} style={styles.subtitleText}>
            TRAVEL JOURNAL & SCRAPBOOK
          </TypewriterText>
        </View>

        {/* Status Pill Badge (1:1 with mockup) */}
        <View style={styles.badgeRow}>
          <StatusBadge entitlements={entitlements} />
        </View>
      </View>

      {/* Main 2-Column Feed: Saved Notes or Quiet Empty State */}
      <View style={styles.contentContainer}>
        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            <Image
              source={require('../assets/empty-stamp.png')}
              style={styles.emptyStamp}
              resizeMode="contain"
            />
            <TypewriterText size="sm" bold color={colors.inkSecondary} style={styles.emptyText}>
              No field notes yet.
            </TypewriterText>
            <TypewriterText size="xs" color={colors.inkMuted} style={styles.emptySubtext}>
              Turn a travel photo into a carved stamp record.
            </TypewriterText>
          </View>
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            renderItem={({ item }) => (
              <NoteCard note={item} onPress={() => handleOpenNote(item)} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Bottom Thumb Zone Action Button (1:1 with mockup) */}
      <View style={styles.bottomBar}>
        <StampButton
          title="New field note"
          onPress={handleNewNote}
          variant="primary"
          style={styles.primaryButton}
        />
      </View>
    </PaperContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  settingsIconWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: -10,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleText: {
    textAlign: 'center',
    fontWeight: '900',
  },
  subtitleText: {
    textAlign: 'center',
    marginTop: 4,
  },
  badgeRow: {
    marginBottom: spacing.md,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  columnWrapper: {
    gap: 12,
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: 110,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyStamp: {
    width: 130,
    height: 130,
    opacity: 0.65,
    marginBottom: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    textAlign: 'center',
    letterSpacing: 0.8,
    maxWidth: 240,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(244, 239, 230, 0.95)',
  },
  primaryButton: {
    width: '100%',
  },
});
