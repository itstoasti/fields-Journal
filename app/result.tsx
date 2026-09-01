import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  Animated,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { PaperContainer, TypewriterText, StampButton } from '../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../src/theme';
import { saveToDeviceGallery } from '../src/lib/image';
import { useAppStore } from '../src/store/useAppStore';

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

  const deleteNote = useAppStore((state) => state.deleteNote);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('POSTER SAVED TO GALLERY');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

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

  const handleSaveToGallery = async () => {
    if (!params.posterUri) return;
    setIsSaving(true);
    const result = await saveToDeviceGallery(params.posterUri);
    setIsSaving(false);

    if (result.success) {
      setSavedSuccess(true);
      triggerToast('POSTER SAVED TO GALLERY');
    } else {
      triggerToast(result.error || 'FAILED TO SAVE');
    }
  };

  const handleShare = async () => {
    if (!params.posterUri) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        triggerToast('SHARING NOT AVAILABLE');
        return;
      }
      await Sharing.shareAsync(params.posterUri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Field Note — ${params.place || 'Record'}`,
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
    if (params.noteId) {
      await deleteNote(params.noteId);
    }
    router.replace('/');
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
            {params.place ? params.place.toUpperCase() : 'FIELD NOTE'}
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkSecondary}>
            NO. {params.number || '01'} · {params.year || '2026'}
          </TypewriterText>
        </View>

        {params.fromLibrary === 'true' ? (
          <Pressable
            onPress={() => setShowDeleteModal(true)}
            style={styles.deleteButton}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Delete note"
          >
            <Ionicons name="trash-outline" size={22} color={colors.oxblood} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Main 4:3 Poster Display */}
      <View style={styles.posterWrapper}>
        <View style={styles.posterCard}>
          <Image
            source={{ uri: params.posterUri }}
            style={styles.posterImage}
            resizeMode="contain"
          />
        </View>

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
                color={toastMessage.includes('SAVED') ? colors.emeraldForest : colors.brickRed}
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
                variant="destructive"
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
  placeholder: {
    width: 44,
  },
  posterWrapper: {
    flex: 1,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
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
