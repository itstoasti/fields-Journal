import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  Pressable,
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

  const handleSaveToGallery = async () => {
    if (!params.posterUri) return;
    setIsSaving(true);
    const result = await saveToDeviceGallery(params.posterUri);
    setIsSaving(false);

    if (result.success) {
      setSavedSuccess(true);
      Alert.alert('Saved', 'The Field Note poster was saved to your device photo gallery.');
    } else {
      Alert.alert('Save to Gallery', result.error || 'Failed to save poster.');
    }
  };

  const handleShare = async () => {
    if (!params.posterUri) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Share', 'Sharing is not available on this device.');
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

  const handleDelete = () => {
    Alert.alert(
      'Delete Field Note',
      'Are you sure you want to remove this note from your local notebook?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (params.noteId) {
              await deleteNote(params.noteId);
            }
            router.replace('/');
          },
        },
      ]
    );
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
            onPress={handleDelete}
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
});
