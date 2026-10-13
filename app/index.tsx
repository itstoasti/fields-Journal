import React, { useCallback, useEffect } from 'react';
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
import { colors, layout, spacing } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';
import { trackEvent, AnalyticsEvents } from '../src/lib/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SAMPLE_KYOTO_POSTER = require('../assets/posters/poster_kyoto.jpg');

export default function HomeScreen() {
  const router = useRouter();
  const notes = useAppStore((state) => state.notes);
  const entitlements = useAppStore((state) => state.entitlements);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);
  const syncWithBackend = useAppStore((state) => state.syncWithBackend);

  useFocusEffect(
    useCallback(() => {
      syncWithBackend();
      trackEvent(AnalyticsEvents.SCREEN_VIEW, { screen: 'home' });
    }, [syncWithBackend])
  );

  // Auto-launch Welcome / Onboarding tutorial on first-time launch
  useEffect(() => {
    if (isInitialized && !hasSeenOnboarding) {
      const timer = setTimeout(() => {
        router.push('/modal/onboarding');
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, hasSeenOnboarding]);

  const handleNewNote = () => {
    trackEvent(AnalyticsEvents.COMPOSE_OPENED);
    router.push('/compose');
  };

  const handleOpenSettings = () => {
    trackEvent(AnalyticsEvents.SETTINGS_OPENED);
    router.push('/settings');
  };

  const handleOpenGuide = () => {
    router.push('/modal/onboarding');
  };

  const handleOpenSampleNote = () => {
    trackEvent(AnalyticsEvents.SAMPLE_NOTE_OPENED);
    const resolvedUri = Image.resolveAssetSource(SAMPLE_KYOTO_POSTER).uri;
    router.push({
      pathname: '/result',
      params: {
        noteId: 'sample-kyoto',
        posterUri: resolvedUri,
        place: 'Kyoto Old District',
        number: '01',
        year: '2026',
        keywords: JSON.stringify(['Cedar trees', 'Temple bell', 'Dusk mist']),
        fromLibrary: 'true',
      },
    });
  };

  const handleOpenNote = (note: any) => {
    trackEvent(AnalyticsEvents.NOTE_OPENED, { noteId: note.id });
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
      {/* Top Header with Wordmark, Guide & Settings */}
      <View style={styles.header}>
        <View style={styles.headerTopActions}>
          <Pressable
            onPress={handleOpenGuide}
            style={styles.headerIconButton}
            accessibilityLabel="Travel Scrapbook Guide"
            accessibilityRole="button"
            hitSlop={12}
          >
            <Ionicons name="book-outline" size={21} color={colors.charcoal} />
          </Pressable>

          <Pressable
            onPress={handleOpenSettings}
            style={styles.headerIconButton}
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

        {/* Status Pill Badge */}
        <View style={styles.badgeRow}>
          <StatusBadge entitlements={entitlements} />
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentContainer}>
        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            {/* Interactive Sample Note Showcase */}
            <Pressable
              onPress={handleOpenSampleNote}
              style={({ pressed }) => [
                styles.sampleCardWrapper,
                pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="View sample Kyoto field note"
            >
              <View style={styles.sampleBadgeRow}>
                <View style={styles.sampleBadgePill}>
                  <Ionicons name="sparkles" size={11} color={colors.oxblood} />
                  <TypewriterText size="xs" bold color={colors.oxblood} letterSpacing={1.2} style={{ marginLeft: 4 }}>
                    SAMPLE RECORD · TAP TO PREVIEW
                  </TypewriterText>
                </View>
              </View>

              <View style={styles.sampleCard}>
                <Image source={SAMPLE_KYOTO_POSTER} style={styles.sampleImage} resizeMode="cover" />
                <View style={styles.cornerTapeTop} />
                <View style={styles.cornerTapeBottom} />
                
                <View style={styles.sampleDetailsBar}>
                  <View style={{ flex: 1 }}>
                    <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1}>
                      KYOTO OLD DISTRICT
                    </TypewriterText>
                    <TypewriterText size="xs" color={colors.inkMuted}>
                      NO. 01 · 2026 · Cedar trees · Temple bell · Dusk mist
                    </TypewriterText>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={20} color={colors.brickRed} />
                </View>
              </View>
            </Pressable>

            {/* Explanatory Prompt */}
            <View style={styles.promptBox}>
              <TypewriterText size="sm" bold color={colors.charcoal} style={styles.emptyPromptTitle}>
                Start your travel scrapbook
              </TypewriterText>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.emptyPromptSub}>
                Upload any vacation photo. Fields turns it into a vintage travel stamp with dates, places, and memories.
              </TypewriterText>
            </View>
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

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <StampButton
          title={notes.length === 0 ? 'Create your first stamp' : 'New travel stamp'}
          onPress={handleNewNote}
          variant="primary"
          style={styles.primaryButton}
          icon={<Ionicons name="add" size={18} color={colors.paper} />}
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
  headerTopActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -10,
  },
  headerIconButton: {
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
    paddingBottom: 90,
  },
  sampleCardWrapper: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sampleBadgeRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  sampleBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBE2D0',
    borderColor: '#D4C4A8',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sampleCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  sampleImage: {
    width: '100%',
    aspectRatio: layout.posterAspectRatio, // 4 / 3 true landscape ratio!
  },
  cornerTapeTop: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 42,
    height: 16,
    backgroundColor: colors.tape,
    borderColor: colors.tapeBorder,
    borderWidth: 0.5,
    transform: [{ rotate: '-35deg' }],
  },
  cornerTapeBottom: {
    position: 'absolute',
    bottom: 50,
    right: 6,
    width: 42,
    height: 16,
    backgroundColor: colors.tape,
    borderColor: colors.tapeBorder,
    borderWidth: 0.5,
    transform: [{ rotate: '-35deg' }],
  },
  sampleDetailsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paperCard,
    borderTopWidth: 1.5,
    borderTopColor: colors.charcoal,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  promptBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    maxWidth: 320,
  },
  emptyPromptTitle: {
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 4,
  },
  emptyPromptSub: {
    textAlign: 'center',
    lineHeight: 18,
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
