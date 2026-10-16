import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  Animated,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { PaperContainer, TypewriterText, StampButton, FieldAlert } from '../src/components';
import { colors, layout, spacing } from '../src/theme';
import { saveToDeviceGallery } from '../src/lib/image';
import { useAppStore } from '../src/store/useAppStore';
import { reportInappropriateContentApi } from '../src/lib/api';
import { Note } from '../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    noteId: string;
    posterUri: string;
    place?: string;
    number?: string;
    year?: string;
    keywords?: string;
    fromLibrary?: string;
  }>();

  const notes = useAppStore((state) => state.notes);
  const deleteNote = useAppStore((state) => state.deleteNote);
  const installationId = useAppStore((state) => state.installationId);

  // Build the array of notes for swipeable horizontal carousel
  const displayNotes: Note[] = useMemo(() => {
    if (notes.length > 0) {
      const exists = notes.some((n) => n.id === params.noteId);
      if (!exists && params.posterUri) {
        return [
          {
            id: params.noteId || 'temp',
            posterUri: params.posterUri,
            place: params.place || '',
            number: params.number || '01',
            year: params.year || '2026',
            keywords: params.keywords ? (typeof params.keywords === 'string' ? JSON.parse(params.keywords) : params.keywords) : [],
            sourceUri: '',
            createdAt: new Date().toISOString(),
            width: 1200,
            height: 900,
          },
          ...notes,
        ];
      }
      return notes;
    }
    if (params.posterUri) {
      return [
        {
          id: params.noteId || 'temp',
          posterUri: params.posterUri,
          place: params.place || '',
          number: params.number || '01',
          year: params.year || '2026',
          keywords: params.keywords ? (typeof params.keywords === 'string' ? JSON.parse(params.keywords) : params.keywords) : [],
          sourceUri: '',
          createdAt: new Date().toISOString(),
          width: 1200,
          height: 900,
        },
      ];
    }
    return [];
  }, [notes, params.noteId, params.posterUri]);

  // Initial index based on noteId
  const initialIndex = useMemo(() => {
    if (!params.noteId) return 0;
    const idx = displayNotes.findIndex((n) => n.id === params.noteId);
    return idx >= 0 ? idx : 0;
  }, [params.noteId, displayNotes]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList<Note>>(null);

  const { width: rnWidth, height: rnHeight } = useWindowDimensions();
  const [webDimensions, setWebDimensions] = useState(() => ({
    width: Platform.OS === 'web' && typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: Platform.OS === 'web' && typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => {
        setWebDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const windowWidth = Platform.OS === 'web' ? webDimensions.width : rnWidth;
  const windowHeight = Platform.OS === 'web' ? webDimensions.height : rnHeight;

  // Responsive card size: stays true 4:3 landscape ratio and fits cleanly between top and bottom bars
  // Available height accounts for topBar (~55px), bottomBar (~90px), and margins/dots (~55px)
  const availableVertical = Platform.OS === 'web'
    ? Math.max(220, windowHeight - 200)
    : (SCREEN_WIDTH - 32) * 0.75;

  const maxAllowedHeight = Platform.OS === 'web'
    ? Math.min(390, Math.round(availableVertical * 0.88))
    : 300;

  const cardWidth = Platform.OS === 'web'
    ? Math.min(520, Math.round(maxAllowedHeight * (4 / 3)), windowWidth - 32)
    : Math.min(350, windowWidth - 32);

  const cardHeight = Math.round(cardWidth * (3 / 4));

  const activeNote = displayNotes[currentIndex] || {
    id: params.noteId,
    posterUri: params.posterUri,
    place: params.place,
    number: params.number,
    year: params.year,
  };

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('POSTER SAVED TO GALLERY');
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Scroll to initial index on mount
  useEffect(() => {
    if (initialIndex > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [initialIndex]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowToast(false);
    });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < displayNotes.length && index !== currentIndex) {
      setCurrentIndex(index);
      setSavedSuccess(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!activeNote.posterUri) return;
    setIsSaving(true);
    const result = await saveToDeviceGallery(activeNote.posterUri);
    setIsSaving(false);

    if (result.success) {
      setSavedSuccess(true);
      triggerToast('POSTER SAVED TO GALLERY');
    } else {
      triggerToast(result.error || 'FAILED TO SAVE');
    }
  };

  const handleShare = async () => {
    if (!activeNote.posterUri) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        triggerToast('SHARING NOT AVAILABLE');
        return;
      }
      await Sharing.shareAsync(activeNote.posterUri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Field Note — ${activeNote.place || 'Record'}`,
      });
    } catch (error: any) {
      console.warn('[Share] Share error:', error);
    }
  };

  const handleNewNote = () => {
    router.replace('/compose');
  };

  const handleBackToHome = () => {
    if (Platform.OS === 'web') {
      try {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/app' as any);
        }
      } catch {
        router.replace('/app' as any);
      }
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          if (window.location.pathname.includes('/result')) {
            window.location.href = '/app';
          }
        }, 80);
      }
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleReportPress = () => {
    FieldAlert.alert(
      'Report Image',
      'If this AI-generated note contains inappropriate, offensive, or infringing imagery, you can flag it for review.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report Output',
          style: 'destructive',
          onPress: async () => {
            try {
              await reportInappropriateContentApi(installationId || 'unknown', 'inappropriate_output', {
                id: activeNote.id,
                place: activeNote.place,
                number: activeNote.number,
                year: activeNote.year,
              });
            } catch {}
            FieldAlert.alert(
              'Report Submitted',
              'Thank you for keeping Fields safe. This result has been reported for review.'
            );
          },
        },
      ]
    );
  };

  const handleDeletePress = () => {
    FieldAlert.alert(
      'Delete Field Note?',
      'This will remove this record from your local notebook.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleConfirmDelete,
        },
      ]
    );
  };

  const handleConfirmDelete = async () => {
    if (activeNote.id) {
      await deleteNote(activeNote.id);
    }
    if (displayNotes.length <= 1) {
      router.replace((Platform.OS === 'web' ? '/app' : '/') as any);
    } else {
      const nextIdx = Math.max(0, currentIndex - 1);
      setCurrentIndex(nextIdx);
    }
  };

  return (
    <PaperContainer>
      {/* Top Bar */}
      <View style={[styles.topBar, Platform.OS === 'web' && { width: '100%', maxWidth: 560, alignSelf: 'center' }]}>
        <Pressable
          onPress={handleBackToHome}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Ionicons name="arrow-back" size={24} color={colors.charcoal} />
        </Pressable>

        <View style={styles.titleBox}>
          <TypewriterText size="sm" bold letterSpacing={2}>
            {activeNote.place ? activeNote.place.toUpperCase() : 'FIELD NOTE'}
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkSecondary}>
            NO. {activeNote.number || '01'} · {activeNote.year || '2026'}
            {displayNotes.length > 1 ? `  (${currentIndex + 1}/${displayNotes.length})` : ''}
          </TypewriterText>
        </View>

        <View style={styles.topBarRight}>
          <Pressable
            onPress={handleReportPress}
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && { opacity: 0.6 },
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Report inappropriate image"
          >
            <Ionicons name="flag-outline" size={19} color={colors.inkMuted} />
          </Pressable>

          <Pressable
            onPress={handleDeletePress}
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && { opacity: 0.6 },
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Delete note"
          >
            <Ionicons name="trash-outline" size={21} color={colors.oxblood} />
          </Pressable>
        </View>
      </View>

      {/* Main Horizontal Presentation */}
      <View style={styles.posterWrapper}>
        {Platform.OS === 'web' ? (
          <View style={styles.webPosterContainer}>
            {displayNotes.length > 1 && (
              <Pressable
                onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                style={[
                  styles.webNavArrow,
                  styles.webNavArrowLeft,
                  currentIndex === 0 && styles.webNavArrowDisabled,
                ]}
                disabled={currentIndex === 0}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Previous note"
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={currentIndex === 0 ? colors.paperBorder : colors.charcoal}
                />
              </Pressable>
            )}

            <View nativeID="result-poster-card" style={[styles.posterCard, { width: cardWidth, height: cardHeight }]}>
              <img
                src={activeNote.posterUri}
                alt={activeNote.place || 'Poster preview'}
                onError={(e) => {
                  if ((e.currentTarget as HTMLImageElement).src !== '/assets/poster_kyoto.jpg') {
                    (e.currentTarget as HTMLImageElement).src = '/assets/poster_kyoto.jpg';
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </View>

            {displayNotes.length > 1 && (
              <Pressable
                onPress={() => setCurrentIndex((prev) => Math.min(displayNotes.length - 1, prev + 1))}
                style={[
                  styles.webNavArrow,
                  styles.webNavArrowRight,
                  currentIndex === displayNotes.length - 1 && styles.webNavArrowDisabled,
                ]}
                disabled={currentIndex === displayNotes.length - 1}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Next note"
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={currentIndex === displayNotes.length - 1 ? colors.paperBorder : colors.charcoal}
                />
              </Pressable>
            )}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayNotes}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            initialScrollIndex={initialIndex > 0 && initialIndex < displayNotes.length ? initialIndex : undefined}
            getItemLayout={(_data, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.pageContainer}>
                <View style={[styles.posterCard, { width: cardWidth, height: cardHeight }]}>
                  <Image
                    source={{ uri: item.posterUri }}
                    style={styles.posterImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}
          />
        )}

        {/* Swipe Page Indicators */}
        {displayNotes.length > 1 && (
          <View style={styles.paginationDots}>
            {displayNotes.map((_, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  setCurrentIndex(idx);
                  if (Platform.OS !== 'web' && flatListRef.current) {
                    flatListRef.current.scrollToIndex({ index: idx, animated: true });
                  }
                }}
                hitSlop={8}
                style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}
              >
                <View
                  style={[
                    styles.dot,
                    idx === currentIndex ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              </Pressable>
            ))}
          </View>
        )}

        {/* Custom Branded Paper Toast */}
        {showToast && (
          <Animated.View
            style={[
              styles.toastContainer,
              {
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.toastBox}>
              <Ionicons
                name={toastMessage.includes('SAVED') ? 'checkmark-circle' : 'information-circle'}
                size={16}
                color={toastMessage.includes('SAVED') ? colors.deepGreen : colors.brickRed}
              />
              <TypewriterText size="xs" bold color={colors.charcoal} style={{ marginLeft: 8 }}>
                {toastMessage}
              </TypewriterText>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Bottom Action Bar: Save, Share, New */}
      <View style={[styles.bottomBar, Platform.OS === 'web' && { width: '100%', alignItems: 'center' }]}>
        <View style={[styles.actionsRow, Platform.OS === 'web' && { maxWidth: 560 }]}>
          <StampButton
            title={savedSuccess ? 'Saved' : 'Save'}
            onPress={handleSaveToGallery}
            variant="secondary"
            loading={isSaving}
            style={styles.actionBtn}
            icon={
              <Ionicons
                name={savedSuccess ? 'checkmark-circle-outline' : 'download-outline'}
                size={18}
                color={colors.charcoal}
              />
            }
          />

          <StampButton
            title="Share"
            onPress={handleShare}
            variant="secondary"
            style={styles.actionBtn}
            icon={<Ionicons name="share-outline" size={18} color={colors.charcoal} />}
          />

          <StampButton
            title="New"
            onPress={handleNewNote}
            variant="primary"
            style={styles.actionBtn}
            icon={<Ionicons name="add-outline" size={18} color={colors.paper} />}
          />
        </View>
      </View>
    </PaperContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  titleBox: {
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  posterWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  webPosterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: spacing.sm,
  },
  webNavArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    cursor: 'pointer',
  },
  webNavArrowLeft: {},
  webNavArrowRight: {},
  webNavArrowDisabled: {
    opacity: 0.2,
    cursor: 'default',
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  posterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: colors.brickRed,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: colors.paperBorder,
  },
  toastContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paperDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.paperBorder,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(244, 239, 230, 0.95)',
    width: '100%',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 560,
  },
  actionBtn: {
    flex: 1,
  },
});
