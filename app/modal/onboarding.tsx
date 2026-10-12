import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  Image,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PaperContainer, TypewriterText, StampButton } from '../../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import { trackEvent, AnalyticsEvents } from '../../src/lib/analytics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const POSTER_KYOTO = require('../../assets/posters/poster_kyoto.jpg');
const POSTER_AMALFI = require('../../assets/posters/poster_amalfi.jpg');
const POSTER_YOSEMITE = require('../../assets/posters/poster_yosemite.jpg');

interface OnboardingSlide {
  id: string;
  poster: any;
  tag: string;
  headline: string;
  body: string;
  pill1: string;
  pill2: string;
  badgeLabel: string;
  metaPlace?: string;
  metaDetails?: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'craft',
    poster: POSTER_KYOTO,
    tag: '✦ YOUR MEMORIES DESERVE BETTER ✦',
    headline: "DON'T LET YOUR TRIPS GET LOST IN YOUR CAMERA ROLL",
    body:
      "You take hundreds of photos on vacation. Don't let them get buried forever in your phone. Fields turns your favorite pictures into vintage travel stamps with your trip's dates, places, and memories.",
    pill1: 'Vintage Travel Stamps',
    pill2: 'Digital Scrapbook',
    badgeLabel: 'KYOTO · FIRST EDITION',
  },
  {
    id: 'archiving',
    poster: POSTER_AMALFI,
    tag: '✦ ZERO EFFORT · INSTANT MAGIC ✦',
    headline: 'SAVE THE PLACES & MEMORIES YOU LOVE',
    body:
      'No editing needed. Fields automatically finds where and when your photo was taken, and suggests 3 words that match the vibe of your trip. From Kyoto temples to Amalfi cliffs—keep your memories alive.',
    pill1: 'Auto Location & Date',
    pill2: '3 Memory Words',
    badgeLabel: 'AMALFI · NO. 02 · 2024',
    metaPlace: 'AMALFI COAST, ITALY',
    metaDetails: 'sea breeze · lemon groves · coastal cliffs',
  },
  {
    id: 'scrapbook',
    poster: POSTER_YOSEMITE,
    tag: '✦ 2 FREE STAMPS ON US ✦',
    headline: 'START YOUR TRAVEL SCRAPBOOK TODAY',
    body:
      'Turn your favorite memories into keepsake travel stamps. Save crisp prints to your photo roll to frame, share, or set as your wallpaper. Your first 2 stamps are 100% free—ready in seconds.',
    pill1: '2 Free Stamps Included',
    pill2: 'Save & Share Anywhere',
    badgeLabel: 'YOSEMITE · FREE TO PRESS',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const setHasSeenOnboarding = useAppStore((state) => state.setHasSeenOnboarding);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  useEffect(() => {
    trackEvent(AnalyticsEvents.ONBOARDING_MODAL_SHOWN);
  }, []);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
  };

  const handleFinish = async (target: 'compose' | 'home') => {
    trackEvent(AnalyticsEvents.ONBOARDING_COMPLETED, { destination: target, finalSlide: currentIndex });
    await setHasSeenOnboarding(true);
    if (target === 'compose') {
      router.replace('/compose');
    } else {
      router.back();
    }
  };

  const handleSkip = async () => {
    trackEvent(AnalyticsEvents.ONBOARDING_SKIPPED, { exitedAtSlide: currentIndex });
    await setHasSeenOnboarding(true);
    router.back();
  };

  const handleNext = () => {
    triggerHaptic();
    if (currentIndex < SLIDES.length - 1) {
      const nextIdx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setCurrentIndex(nextIdx);
    } else {
      handleFinish('compose');
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page >= 0 && page < SLIDES.length && page !== currentIndex) {
      setCurrentIndex(page);
    }
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  // Width of the visual card and text block for balanced margins
  const HERO_CARD_WIDTH = Math.min(SCREEN_WIDTH - spacing.lg * 2, 350);

  return (
    <PaperContainer>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandPill}>
          <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.5}>
            ✦ FIELDS · EXPEDITION JOURNAL ✦
          </TypewriterText>
        </View>

        <Pressable
          onPress={handleSkip}
          style={styles.skipButton}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1}>
            SKIP
          </TypewriterText>
          <Ionicons name="arrow-forward" size={14} color={colors.inkSecondary} />
        </Pressable>
      </View>

      {/* Main Full-Screen Swipeable FlatList */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.carousel}
        renderItem={({ item, index }) => (
          <View style={[styles.slidePage, { width: SCREEN_WIDTH }]}>
            {/* Visual Hero Stamp Card - True 4:3 landscape ratio so it NEVER cuts off */}
            <View style={styles.heroWrapper}>
              <View style={[styles.posterFrame, { width: HERO_CARD_WIDTH }]}>
                {/* 4 Diagonal Translucent Masking Tape Strips on corners */}
                <View style={[styles.tape, styles.tapeTopLeft]} pointerEvents="none" />
                <View style={[styles.tape, styles.tapeTopRight]} pointerEvents="none" />
                <View style={[styles.tape, styles.tapeBottomLeft]} pointerEvents="none" />
                <View style={[styles.tape, styles.tapeBottomRight]} pointerEvents="none" />

                {/* The Uncropped 4:3 Poster */}
                <View style={styles.posterInner}>
                  {Platform.OS === 'web' ? (
                    <img
                      src={item.poster}
                      alt={item.headline}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <Image source={item.poster} style={styles.posterImage} resizeMode="cover" />
                  )}

                  {/* Stamp Badge Overlay in bottom-right corner */}
                  <View style={styles.floatingSealBadge}>
                    <Ionicons name="sparkles" size={10} color={colors.oxblood} />
                    <TypewriterText size="xs" bold color={colors.oxblood} letterSpacing={0.8} style={{ marginLeft: 3 }}>
                      {item.badgeLabel}
                    </TypewriterText>
                  </View>
                </View>
              </View>

              {/* Slide 2: Archival Metadata Inset Tag */}
              {item.metaPlace && (
                <View style={[styles.metaPillBox, { width: HERO_CARD_WIDTH }]}>
                  <View style={styles.metaPillHeader}>
                    <Ionicons name="location-sharp" size={12} color={colors.brickRed} />
                    <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1} style={{ marginLeft: 4 }}>
                      {item.metaPlace}
                    </TypewriterText>
                  </View>
                  <TypewriterText size="xs" color={colors.inkSecondary} style={styles.metaPillSub}>
                    {item.metaDetails}
                  </TypewriterText>
                </View>
              )}
            </View>

            {/* Content & Excitement Text Section */}
            <View style={styles.textSection}>
              <View style={styles.tagBadge}>
                <TypewriterText size="xs" bold color={colors.brickRed} letterSpacing={1.2}>
                  {item.tag}
                </TypewriterText>
              </View>

              <TypewriterText size="lg" bold color={colors.charcoal} letterSpacing={1.5} style={styles.headline}>
                {item.headline}
              </TypewriterText>

              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.bodyText}>
                {item.body}
              </TypewriterText>

              {/* Value Feature Pills Row */}
              <View style={styles.featurePillsRow}>
                <View style={styles.featurePill}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.deepGreen} />
                  <TypewriterText size="xs" bold color={colors.charcoal} style={{ marginLeft: 5 }}>
                    {item.pill1}
                  </TypewriterText>
                </View>
                <View style={styles.featurePill}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.deepGreen} />
                  <TypewriterText size="xs" bold color={colors.charcoal} style={{ marginLeft: 5 }}>
                    {item.pill2}
                  </TypewriterText>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* Bottom Sticky Action Zone */}
      <View style={styles.bottomControls}>
        {/* Pagination Dots */}
        <View style={styles.paginationDots}>
          {SLIDES.map((_, idx) => (
            <Pressable
              key={idx}
              onPress={() => {
                triggerHaptic();
                flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                setCurrentIndex(idx);
              }}
              hitSlop={10}
            >
              <View style={[styles.dot, idx === currentIndex ? styles.activeDot : styles.inactiveDot]} />
            </Pressable>
          ))}
        </View>

        {/* Action Button */}
        <StampButton
          title={isLastSlide ? 'CREATE YOUR FIRST STAMP (FREE)' : 'NEXT STEP'}
          onPress={handleNext}
          variant="primary"
          style={styles.primaryBtn}
          icon={
            isLastSlide ? (
              <Ionicons name="sparkles" size={17} color={colors.paper} />
            ) : (
              <Ionicons name="arrow-forward" size={17} color={colors.paper} />
            )
          }
        />

        <View style={styles.secondaryLinkRow}>
          <Pressable onPress={() => handleFinish('home')} hitSlop={10} style={styles.secondaryLink}>
            <TypewriterText size="xs" color={colors.inkSecondary} style={styles.secondaryLinkText}>
              Explore notebook first
            </TypewriterText>
          </Pressable>
        </View>
      </View>
    </PaperContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  brandPill: {
    backgroundColor: '#EBE2D0',
    borderColor: '#D4C4A8',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  carousel: {
    flex: 1,
  },
  slidePage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  heroWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  posterFrame: {
    aspectRatio: layout.posterAspectRatio, // 4 / 3 true landscape ratio!
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 8,
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
    position: 'relative',
  },
  posterInner: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  tape: {
    position: 'absolute',
    width: 48,
    height: 18,
    backgroundColor: colors.tape,
    borderColor: colors.tapeBorder,
    borderWidth: 0.5,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 4,
  },
  tapeTopLeft: {
    top: 2,
    left: 2,
    transform: [{ rotate: '-35deg' }],
  },
  tapeTopRight: {
    top: 2,
    right: 2,
    transform: [{ rotate: '35deg' }],
  },
  tapeBottomLeft: {
    bottom: 2,
    left: 2,
    transform: [{ rotate: '35deg' }],
  },
  tapeBottomRight: {
    bottom: 2,
    right: 2,
    transform: [{ rotate: '-35deg' }],
  },
  floatingSealBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 239, 230, 0.94)',
    borderColor: colors.oxblood,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  metaPillBox: {
    backgroundColor: colors.paperCard,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginTop: 8,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  metaPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metaPillSub: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  textSection: {
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
    paddingHorizontal: spacing.xs,
  },
  tagBadge: {
    marginBottom: 4,
  },
  headline: {
    lineHeight: 24,
    marginBottom: 8,
    fontWeight: '900',
  },
  bodyText: {
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  featurePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paperDark,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  bottomControls: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.brickRed,
  },
  inactiveDot: {
    width: 7,
    backgroundColor: colors.paperBorder,
  },
  primaryBtn: {
    width: '100%',
    minHeight: 48,
  },
  secondaryLinkRow: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  secondaryLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  secondaryLinkText: {
    textDecorationLine: 'underline',
  },
});
