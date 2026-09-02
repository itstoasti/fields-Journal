import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  Animated,
  Modal,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { PaperContainer, TypewriterText, StampButton } from '../src/components';
import { colors, layout, spacing } from '../src/theme';
import { saveToDeviceGallery } from '../src/lib/image';
import { useAppStore } from '../src/store/useAppStore';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    router.replace('/');
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (activeNote.id) {
      await deleteNote(activeNote.id);
    }
    if (displayNotes.length <= 1) {
      router.replace('/');
    } else {
      const nextIdx = Math.max(0, currentIndex - 1);
      setCurrentIndex(nextIdx);
    }
  };

  return (
    <PaperContainer>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={handleBackToHome}
          style={styles.backButton}
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

        <Pressable
          onPress={() => setShowDeleteModal(true)}
          style={styles.deleteButton}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Delete note"
        >
          <Ionicons name="trash-outline" size={22} color={colors.oxblood} />
        </Pressable>
      </View>

      {/* Main Horizontal Swipeable FlatList */}
      <View style={styles.posterWrapper}>
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
              <View style={styles.posterCard}>
                <Image
                  source={{ uri: item.posterUri }}
                  style={styles.posterImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          )}
        />

        {/* Swipe Page Indicators */}
        {displayNotes.length > 1 && (
          <View style={styles.paginationDots}>
            {displayNotes.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
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
      <View style={styles.bottomBar}>
        <View style={styles.actionsRow}>
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

      {/* Custom Branded Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TypewriterText size="md" bold color={colors.charcoal} style={{ marginBottom: spacing.xs }}>
              DELETE FIELD NOTE?
            </TypewriterText>
            <TypewriterText size="xs" color={colors.inkSecondary} style={{ marginBottom: spacing.lg, textAlign: 'center' }}>
              This will remove this record from your local notebook.
            </TypewriterText>

            <View style={styles.modalButtonsRow}>
              <StampButton
                title="Cancel"
                onPress={() => setShowDeleteModal(false)}
                variant="secondary"
                style={styles.modalBtn}
              />
              <StampButton
                title="Delete"
                onPress={handleConfirmDelete}
                variant="danger"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleBox: {
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  posterWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  posterCard: {
    width: '100%',
    aspectRatio: layout.posterAspectRatio,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
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
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 16,
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
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 36, 32, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.charcoal,
    borderRadius: 8,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
  },
});
