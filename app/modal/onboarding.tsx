import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  useWindowDimensions,
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

const POSTER_KYOTO = require('../../assets/posters/poster_kyoto.jpg');
const POSTER_AMALFI = require('../../assets/posters/poster_amalfi.jpg');
const POSTER_YOSEMITE = require('../../assets/posters/poster_yosemite.jpg');

export function getAssetUri(asset: any, fallback: string): string {
  if (!asset) return fallback;
  if (typeof asset === 'string') return asset;
  if (typeof asset === 'object') {
    if (typeof asset.uri === 'string') return asset.uri;
    if (typeof asset.default === 'string') return asset.default;
    if (asset.default && typeof asset.default.uri === 'string') return asset.default.uri;
  }
  return fallback;
}

interface OnboardingSlide {
  id: string;
  poster: any;
  fallbackUrl: string;
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
    fallbackUrl: '/assets/poster_kyoto.jpg',
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
    fallbackUrl: '/assets/poster_amalfi.jpg',
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
    fallbackUrl: '/assets/poster_yosemite.jpg',
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
  const { width: rnWidth, height: rnHeight } = useWindowDimensions();
  const [webDimensions, setWebDimensions] = useState(() => ({
    width: Platform.OS === 'web' && typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: Platform.OS === 'web' && typeof window !== 'undefined' ? window.innerHeight : 900,
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

  useEffect(() => {
    trackEvent(AnalyticsEvents.ONBOARDING_MODAL_SHOWN);
  }, []);

  const touchStartX = useRef<number | null>(null);

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
      setCurrentIndex(nextIdx);
      if (Platform.OS !== 'web' && flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({ index: nextIdx, animated: true });
        } catch {
          flatListRef.current.scrollToOffset({ offset: nextIdx * windowWidth, animated: true });
        }
      }
    } else {
      handleFinish('compose');
    }
  };

  const handleDotPress = (idx: number) => {
    triggerHaptic();
    setCurrentIndex(idx);
    if (Platform.OS !== 'web' && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({ index: idx, animated: true });
      } catch {
        flatListRef.current.scrollToOffset({ offset: idx * windowWidth, animated: true });
      }
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / windowWidth);
    if (page >= 0 && page < SLIDES.length && page !== currentIndex) {
      setCurrentIndex(page);
    }
  };

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent?.pageX ?? e.nativeEvent?.clientX ?? null;
  };

  const handleTouchEnd = (e: any) => {
    if (touchStartX.current === null) return;
    const currentX = e.nativeEvent?.pageX ?? e.nativeEvent?.clientX ?? null;
    if (currentX !== null) {
      const diff = touchStartX.current - currentX;
      if (diff > 40 && currentIndex < SLIDES.length - 1) {
        handleNext();
      } else if (diff < -40 && currentIndex > 0) {
        triggerHaptic();
        setCurrentIndex((prev) => prev - 1);
      }
    }
    touchStartX.current = null;
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  // Responsive hero card width:
  // On web: Defaults to 500px wide (matching Picture 1 "much bigger perfect size"),
  // dynamically scaling if available viewport height is constrained (< 700px) so the bottom button never scrolls off-screen.
  const availableHeightForCard = windowHeight > 0 ? windowHeight - 330 : 400;
  const maxCardWidthByHeight = Math.round(availableHeightForCard * (4 / 3));

  const HERO_CARD_WIDTH = Platform.OS === 'web'
    ? Math.min(500, Math.max(340, maxCardWidthByHeight), windowWidth > 0 ? windowWidth - spacing.lg * 2 : 500)
    : Math.min(350, windowWidth - spacing.lg * 2);

  const renderSlide = (item: OnboardingSlide) => (
    <View style={[styles.slidePage, Platform.OS === 'web' ? styles.webSlidePage : { width: windowWidth }]}>
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
                src={getAssetUri(item.poster, item.fallbackUrl)}
                alt={item.headline}
                onError={(e) => {
                  if ((e.currentTarget as HTMLImageElement).src !== item.fallbackUrl) {
                    (e.currentTarget as HTMLImageElement).src = item.fallbackUrl;
                  }
                }}
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
              <TypewriterText size="xs" bold color={colors.oxblood} letterSpacing={0.8} style={{ marginLeft: 3, fontSize: 11 }}>
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
              <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={0.8} style={{ marginLeft: 3, fontSize: 11 }}>
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

        <TypewriterText
          bold
          color={colors.charcoal}
          style={styles.headline}
        >
          {item.headline}
        </TypewriterText>

        <TypewriterText
          color={colors.inkSecondary}
          style={styles.bodyText}
        >
          {item.body}
        </TypewriterText>

        {/* Value Feature Pills Row */}
        <View style={styles.featurePillsRow}>
          <View style={styles.featurePill}>
            <Ionicons name="checkmark-circle" size={13} color={colors.deepGreen} />
            <TypewriterText size="xs" bold color={colors.charcoal} style={{ marginLeft: 5, fontSize: 12 }}>
              {item.pill1}
            </TypewriterText>
          </View>
          <View style={styles.featurePill}>
            <Ionicons name="checkmark-circle" size={13} color={colors.deepGreen} />
            <TypewriterText size="xs" bold color={colors.charcoal} style={{ marginLeft: 5, fontSize: 12 }}>
              {item.pill2}
            </TypewriterText>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <PaperContainer>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandPill}>
          <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.5}>
            ✦ FIELDS · TRAVEL SCRAPBOOK ✦
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

      {/* Main Slide Presentation (Web renders current slide directly, Native uses FlatList) */}
      {Platform.OS === 'web' ? (
        <View
          style={styles.webSlideContainer}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {renderSlide(SLIDES[currentIndex])}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          getItemLayout={(_data, index) => ({
            length: windowWidth,
            offset: windowWidth * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToOffset({
                offset: info.index * windowWidth,
                animated: true,
              });
            }, 50);
          }}
          style={styles.carousel}
          renderItem={({ item }) => renderSlide(item)}
        />
      )}

      {/* Bottom Sticky Action Zone */}
      <View style={styles.bottomControls}>
        {/* Pagination Dots */}
        <View style={styles.paginationDots}>
          {SLIDES.map((_, idx) => (
            <Pressable
              key={idx}
              onPress={() => handleDotPress(idx)}
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
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
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
    marginBottom: spacing.md,
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
    alignSelf: 'center',
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
  tapeCompact: {
    width: 42,
    height: 15,
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
  floatingSealBadgeCompact: {
    bottom: 6,
    right: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
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
  metaPillBoxCompact: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginTop: 5,
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
    maxWidth: 500,
    alignSelf: 'center',
    paddingHorizontal: spacing.xs,
  },
  tagBadge: {
    marginBottom: 4,
  },
  headline: {
    fontSize: 15.5,
    lineHeight: 22,
    marginBottom: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headlineCompact: {
    fontSize: 13.5,
    lineHeight: 18,
    marginBottom: 4,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  bodyText: {
    fontSize: 11.5,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  bodyTextCompact: {
    fontSize: 10.5,
    lineHeight: 15,
    marginBottom: 6,
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
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  webSlideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  webSlidePage: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
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
