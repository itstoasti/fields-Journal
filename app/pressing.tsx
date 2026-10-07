import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Easing,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PaperContainer, TypewriterText, StampButton } from '../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';
import { preparePhotoForGeneration, savePosterLocally } from '../src/lib/image';
import { submitGenerateNote } from '../src/lib/api';
import { Note } from '../src/types';

interface PressStage {
  label: string;
  subtext: string;
  thresholdSec: number;
}

const STAGES: PressStage[] = [
  {
    label: 'analyzing composition',
    subtext: 'evaluating focal lines, contrast & lighting',
    thresholdSec: 0,
  },
  {
    label: 'carving linocut relief',
    subtext: 'chiseling plate contours & natural terrain',
    thresholdSec: 4,
  },
  {
    label: 'mixing archival pigments',
    subtext: 'formulating mineral spot inks & vintage sepia',
    thresholdSec: 9,
  },
  {
    label: 'inking relief block',
    subtext: 'rolling pigment across the raised linocut plate',
    thresholdSec: 14,
  },
  {
    label: 'hand-pressing platen',
    subtext: 'applying mechanical pressure to parchment',
    thresholdSec: 19,
  },
  {
    label: 'lifting & setting print',
    subtext: 'inspecting deckled edges & archival drying',
    thresholdSec: 25,
  },
];

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

  const [phase, setPhase] = useState<'working' | 'error'>('working');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [dotCount, setDotCount] = useState<number>(1);
  const [frameHeight, setFrameHeight] = useState<number>(240);

  // Animations
  const pressScaleAnim = useRef(new Animated.Value(1.0)).current;
  const pulseOverlayAnim = useRef(new Animated.Value(0.2)).current;
  const rollerAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0.06)).current;
  const dotPulseAnim = useRef(new Animated.Value(1)).current;
  const reassuranceOpacity = useRef(new Animated.Value(0)).current;

  const isStarted = useRef(false);
  const lastStageRef = useRef(0);

  // Derive active stage from elapsed time
  const currentStageIndex = useMemo(() => {
    let index = 0;
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (elapsedSec >= STAGES[i].thresholdSec) {
        index = i;
        break;
      }
    }
    return index;
  }, [elapsedSec]);

  const currentStage = STAGES[currentStageIndex];

  // Trigger subtle haptic on stage change
  useEffect(() => {
    if (currentStageIndex !== lastStageRef.current && phase === 'working') {
      lastStageRef.current = currentStageIndex;
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }
    }
  }, [currentStageIndex, phase]);

  // Animate progress smoothly towards stage targets
  useEffect(() => {
    if (phase !== 'working') return;

    const targetProgress = Math.min(
      0.94,
      0.06 + (currentStageIndex / (STAGES.length - 1)) * 0.85 + (elapsedSec % 5) * 0.015
    );

    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: 1200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [currentStageIndex, elapsedSec, phase]);

  // Fade in reassurance message if taking longer than 15s
  useEffect(() => {
    if (elapsedSec === 16) {
      Animated.timing(reassuranceOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [elapsedSec]);

  useEffect(() => {
    // 1. Mechanical Platen Press breathing loop
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pressScaleAnim, {
          toValue: 0.982,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pressScaleAnim, {
          toValue: 1.0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    scaleLoop.start();

    // 2. Overlay pulse loop
    const overlayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOverlayAnim, {
          toValue: 0.55,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOverlayAnim, {
          toValue: 0.15,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    overlayLoop.start();

    // 3. Continuous ink roller sweep across the photo (every 2.6s)
    const rollerLoop = Animated.loop(
      Animated.timing(rollerAnim, {
        toValue: 1,
        duration: 2600,
        easing: Easing.inOut(Easing.linear),
        useNativeDriver: true,
      })
    );
    rollerLoop.start();

    // 4. Status indicator pulsing dot
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulseAnim, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotPulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    dotLoop.start();

    // 5. Elapsed seconds timer
    const timerInterval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    // 6. Dot cycler (continuous micro-animation)
    const dotInterval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 450);

    // 7. Kick off generation once
    if (!isStarted.current) {
      isStarted.current = true;
      runGeneration();
    }

    return () => {
      scaleLoop.stop();
      overlayLoop.stop();
      rollerLoop.stop();
      dotLoop.stop();
      clearInterval(timerInterval);
      clearInterval(dotInterval);
    };
  }, []);

  const runGeneration = async () => {
    try {
      setPhase('working');
      setErrorMessage('');

      // Step 1: Prepare and downscale photo
      const processed = await preparePhotoForGeneration(params.photoUri);
      if (!processed.base64) {
        throw new Error('Could not process photo for generation.');
      }

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

      if (!response.success) {
        throw new Error('Generation was unsuccessful.');
      }

      // Step 3: Fast finish animation to 100%
      Animated.timing(progressAnim, {
        toValue: 1.0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();

      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }

      // Step 4: Save generated poster locally
      const posterData = response.imageBase64 || response.imageUrl || '';
      const localPosterUri = await savePosterLocally(response.noteId, posterData);

      // Step 5: Create Note item & add to local library
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

      // Step 6: Update store entitlements
      if (response.userState) {
        updateEntitlements(response.userState);
      }

      // Step 7: Navigate to Result
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
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setElapsedSec(0);
    lastStageRef.current = 0;
    progressAnim.setValue(0.06);
    reassuranceOpacity.setValue(0);
    runGeneration();
  };

  const handleCancel = () => {
    router.back();
  };

  const onFrameLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) {
      setFrameHeight(height);
    }
  };

  // Interpolated inking roller position
  const rollerTranslateY = rollerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, frameHeight + 10],
  });

  const progressWidthPercent = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const formatTimer = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const dotsString = '.'.repeat(dotCount);

  return (
    <PaperContainer contentStyle={styles.container}>
      {/* Top Quiet Label */}
      <View style={styles.topStatus}>
        <TypewriterText size="xs" color={colors.inkSecondary} letterSpacing={2}>
          FIELD PRESS NO. {params.number || '01'}
        </TypewriterText>
      </View>

      {/* Main Visual: Original Photo with active platen breathing & inking roller sweep */}
      <View style={styles.plateContainer}>
        <Animated.View
          style={[
            styles.photoFrame,
            phase === 'working' && {
              transform: [{ scale: pressScaleAnim }],
            },
          ]}
          onLayout={onFrameLayout}
        >
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

          {phase === 'working' && (
            <>
              {/* Subtle ink wash overlay */}
              <Animated.View
                style={[
                  styles.pressOverlay,
                  {
                    opacity: pulseOverlayAnim,
                  },
                ]}
              />

              {/* Active Inking Roller Line moving down the plate */}
              <Animated.View
                style={[
                  styles.rollerSweep,
                  {
                    transform: [{ translateY: rollerTranslateY }],
                  },
                ]}
              >
                <View style={styles.rollerGlow} />
                <View style={styles.rollerLine} />
              </Animated.View>
            </>
          )}
        </Animated.View>

        {/* Dynamic Activity Indicators */}
        <View style={styles.statusBox}>
          {phase === 'working' && (
            <>
              {/* Progress Meter Bar */}
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: progressWidthPercent },
                  ]}
                />
              </View>

              {/* Stage Pips */}
              <View style={styles.stagePipsRow}>
                {STAGES.map((_, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.stagePip,
                        isDone && styles.stagePipDone,
                        isCurrent && styles.stagePipCurrent,
                      ]}
                    />
                  );
                })}
              </View>

              {/* Stage Title with dancing dots */}
              <TypewriterText size="base" bold color={colors.charcoal} style={styles.phaseText}>
                {currentStage.label}{dotsString}
              </TypewriterText>

              {/* Stage Subtext */}
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.phaseSubtext}>
                {currentStage.subtext}
              </TypewriterText>

              {/* Live Heartbeat & Elapsed Timer Badge */}
              <View style={styles.heartbeatBadge}>
                <Animated.View
                  style={[styles.heartbeatDot, { opacity: dotPulseAnim }]}
                />
                <TypewriterText size="xs" color={colors.inkSecondary} letterSpacing={1.2}>
                  PRESSING ACTIVE · {formatTimer(elapsedSec)}
                </TypewriterText>
              </View>

              {/* Reassurance Message for longer operations */}
              <Animated.View
                style={[
                  styles.reassuranceBox,
                  { opacity: reassuranceOpacity },
                ]}
              >
                <TypewriterText size="xs" color={colors.ochre} style={styles.reassuranceText}>
                  {elapsedSec >= 28
                    ? 'Final artisanal touches… almost ready'
                    : 'Intricate linocut relief in progress… taking extra care with details'}
                </TypewriterText>
              </Animated.View>
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
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
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
    backgroundColor: 'rgba(244, 239, 230, 0.45)',
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    borderRadius: 2,
  },
  rollerSweep: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 24,
    zIndex: 10,
  },
  rollerGlow: {
    height: 22,
    backgroundColor: 'rgba(156, 61, 40, 0.15)',
  },
  rollerLine: {
    height: 2,
    backgroundColor: colors.brickRed,
    shadowColor: colors.brickRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  statusBox: {
    marginTop: spacing.lg,
    alignItems: 'center',
    minHeight: 140,
    width: '100%',
  },
  progressTrack: {
    width: '80%',
    maxWidth: 260,
    height: 3,
    backgroundColor: colors.paperBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brickRed,
    borderRadius: 2,
  },
  stagePipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  stagePip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.inkLight,
  },
  stagePipDone: {
    backgroundColor: colors.charcoal,
  },
  stagePipCurrent: {
    backgroundColor: colors.brickRed,
    width: 16,
    borderRadius: 3,
  },
  phaseText: {
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  phaseSubtext: {
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  heartbeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(224, 214, 195, 0.5)',
    borderWidth: 1,
    borderColor: colors.paperBorder,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: spacing.md,
  },
  heartbeatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brickRed,
  },
  reassuranceBox: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  reassuranceText: {
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.3,
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
