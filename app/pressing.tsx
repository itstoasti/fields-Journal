import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Easing,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PaperContainer, TypewriterText, StampButton } from '../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';
import { preparePhotoForGeneration, savePosterLocally } from '../src/lib/image';
import { submitGenerateNote } from '../src/lib/api';
import { Note } from '../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PressingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    photoUri: string;
    place: string;
    number: string;
    keyword1: string;
    keyword2: string;
    keyword3: string;
    year: string;
    entitlement: 'free' | 'ad' | 'credit' | 'pro';
  }>();

  const installationId = useAppStore((state) => state.installationId);
  const deviceId = useAppStore((state) => state.deviceId);
  const selectedModel = useAppStore((state) => state.selectedModel);
  const addNote = useAppStore((state) => state.addNote);
  const updateEntitlements = useAppStore((state) => state.updateEntitlements);

  const [phase, setPhase] = useState<'carving' | 'pressing' | 'error'>('carving');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Subtle breathing opacity animation for quiet pressing effect
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const isStarted = useRef(false);

  useEffect(() => {
    // Start pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Start generation
    if (!isStarted.current) {
      isStarted.current = true;
      runGeneration();
    }
  }, []);

  const runGeneration = async () => {
    try {
      setPhase('carving');

      // Step 1: Prepare and downscale photo
      const processed = await preparePhotoForGeneration(params.photoUri);
      if (!processed.base64) {
        throw new Error('Could not process photo for generation.');
      }

      // Transition text to pressing plate after 3 seconds
      const phaseTimer = setTimeout(() => {
        setPhase('pressing');
      }, 4000);

      // Step 2: Call backend
      const response = await submitGenerateNote({
        imageBase64: processed.base64,
        mimeType: 'image/jpeg',
        place: params.place || '',
        number: params.number || '01',
        keywords: [params.keyword1 || '', params.keyword2 || '', params.keyword3 || ''],
        year: params.year || new Date().getFullYear().toString(),
        entitlement: params.entitlement || 'free',
        installationId,
        deviceId,
        model: selectedModel,
      });

      clearTimeout(phaseTimer);

      if (!response.success) {
        throw new Error('Generation was unsuccessful.');
      }

      // Step 3: Save generated poster locally
      const posterData = response.imageBase64 || response.imageUrl || '';
      const localPosterUri = await savePosterLocally(response.noteId, posterData);

      // Step 4: Create Note item & add to local library
      const newNote: Note = {
        id: response.noteId,
        createdAt: new Date().toISOString(),
        place: params.place || 'Field Observation',
        number: params.number || '01',
        keywords: [params.keyword1 || '', params.keyword2 || '', params.keyword3 || ''],
        year: params.year || new Date().getFullYear().toString(),
        sourceUri: params.photoUri,
        posterUri: localPosterUri,
        width: 1600,
        height: 1200,
      };

      await addNote(newNote);

      // Step 5: Update store entitlements
      if (response.userState) {
        updateEntitlements(response.userState);
      }

      // Step 6: Navigate to Result
      router.replace({
        pathname: '/result',
        params: {
          noteId: newNote.id,
          posterUri: localPosterUri,
          place: newNote.place,
          number: newNote.number,
          year: newNote.year,
          keywords: JSON.stringify(newNote.keywords),
        },
      });
    } catch (err: any) {
      console.error('[Pressing] Error during generation:', err);
      setPhase('error');
      setErrorMessage(err.message || 'An unexpected error occurred.');
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    runGeneration();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <PaperContainer contentStyle={styles.container}>
      {/* Top Quiet Label */}
      <View style={styles.topStatus}>
        <TypewriterText size="xs" color={colors.inkSecondary} letterSpacing={2}>
          FIELD PRESS NO. {params.number || '01'}
        </TypewriterText>
      </View>

      {/* Main Visual: Original Photo with subtle plate press outline */}
      <View style={styles.plateContainer}>
        <View style={styles.photoFrame}>
          {Platform.OS === 'web' ? (
            <img
              src={params.photoUri}
              alt="Source travel photo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 1,
                display: 'block',
              }}
            />
          ) : (
            <Image
              source={{ uri: params.photoUri }}
              style={styles.sourceImage}
              resizeMode="cover"
            />
          )}
          {phase !== 'error' && (
            <Animated.View
              style={[
                styles.pressOverlay,
                {
                  opacity: pulseAnim,
                },
              ]}
            />
          )}
        </View>

        {/* Quiet Status Text */}
        <View style={styles.statusBox}>
          {phase === 'carving' && (
            <>
              <TypewriterText size="base" bold color={colors.charcoal} style={styles.phaseText}>
                carving stamp…
              </TypewriterText>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.phaseSubtext}>
                isolating terrain and distinctive contours
              </TypewriterText>
            </>
          )}

          {phase === 'pressing' && (
            <>
              <TypewriterText size="base" bold color={colors.charcoal} style={styles.phaseText}>
                pressing plate…
              </TypewriterText>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.phaseSubtext}>
                transferring spot inks to aged paper
              </TypewriterText>
            </>
          )}

          {phase === 'error' && (
            <View style={styles.errorBox}>
              <TypewriterText size="sm" bold color={colors.error} style={styles.phaseText}>
                Pressing Interrupted
              </TypewriterText>
              <TypewriterText size="xs" color={colors.charcoal} style={styles.errorSubtext}>
                {errorMessage}
              </TypewriterText>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.errorNote}>
                Your free slot / credits were not deducted.
              </TypewriterText>

              <View style={styles.errorButtonsRow}>
                <StampButton
                  title="Retry"
                  onPress={handleRetry}
                  variant="primary"
                  style={styles.errorButton}
                />
                <StampButton
                  title="Back"
                  onPress={handleCancel}
                  variant="secondary"
                  style={styles.errorButton}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Footer watermark / metadata */}
      <View style={styles.footer}>
        <TypewriterText size="xs" color={colors.inkMuted} letterSpacing={1}>
          {params.place || 'Field Observation'} · {params.year || '2026'}
        </TypewriterText>
      </View>
    </PaperContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  topStatus: {
    alignItems: 'center',
  },
  plateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  photoFrame: {
    width: '100%',
    aspectRatio: layout.posterAspectRatio,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  sourceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
  },
  pressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244, 239, 230, 0.4)',
    borderWidth: 2,
    borderColor: colors.charcoal,
    borderRadius: 2,
  },
  statusBox: {
    marginTop: spacing.xl,
    alignItems: 'center',
    minHeight: 120,
    width: '100%',
  },
  phaseText: {
    letterSpacing: 1.8,
    marginBottom: spacing.xs,
  },
  phaseSubtext: {
    letterSpacing: 0.8,
  },
  errorBox: {
    alignItems: 'center',
    width: '100%',
  },
  errorSubtext: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  errorNote: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.sm,
  },
  errorButton: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
  },
});
