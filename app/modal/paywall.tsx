import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TypewriterText, StampButton } from '../../src/components';
import { colors, layout, spacing } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import {
  buyLifetimePackage,
  buyNotes20Package,
  restorePurchases,
} from '../../src/lib/purchases';
import { syncPurchasedCredits, getApiBaseUrl } from '../../src/lib/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_PADDING = spacing.lg;
const CARD_WIDTH = Math.min(SCREEN_WIDTH - MODAL_PADDING * 2 - 16, 320);
const CARD_GAP = 12;

// Authentic sample Field Note outputs bundled locally
const SAMPLE_PLATES = [
  {
    id: 'kyoto',
    title: 'Kyoto Old District',
    number: 'No. 01',
    description: '3 spot inks · Pagoda linocut · Aged paper',
    image: require('../../assets/posters/poster_kyoto.jpg'),
  },
  {
    id: 'yosemite',
    title: 'Yosemite Valley',
    number: 'No. 02',
    description: 'Pine green & terracotta · Half Dome stamp',
    image: require('../../assets/posters/poster_yosemite.jpg'),
  },
  {
    id: 'amalfi',
    title: 'Amalfi Coast',
    number: 'No. 03',
    description: 'Cobalt & ochre · Positano cliffside print',
    image: require('../../assets/posters/poster_amalfi.jpg'),
  },
];

export default function PaywallModal() {
  const router = useRouter();
  const installationId = useAppStore((state) => state.installationId);
  const updateEntitlements = useAppStore((state) => state.updateEntitlements);

  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'lifetime' | 'pack20'>('lifetime');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const carouselRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index >= 0 && index < SAMPLE_PLATES.length && index !== activeSlide) {
      setActiveSlide(index);
    }
  };

  const handleSelectPlan = (plan: 'lifetime' | 'pack20') => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedPlan(plan);
  };

  // Purchase Lifetime Pro ($29.99)
  const handlePurchaseLifetime = async () => {
    setIsPurchasing(true);
    try {
      const { success, isPro, error } = await buyLifetimePackage();
      if (isPro || success) {
        updateEntitlements({ isPro: true, entitlement: 'pro' });
        Alert.alert(
          'Fields Pro Unlocked',
          'Thank you for supporting Fields! You now have lifetime unlimited field note stamps.',
          [{ text: 'Start Creating', onPress: () => router.back() }]
        );
      } else if (error !== 'cancelled') {
        Alert.alert('Purchase', error || 'Unable to complete purchase.');
      }
    } catch (err: any) {
      console.warn('[Paywall] Lifetime purchase error:', err);
      Alert.alert('Purchase', err?.message || 'Payment failed.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Consumable 20 Notes Pack ($2.99)
  const handlePurchase20 = async () => {
    setIsPurchasing(true);
    try {
      const result = await buyNotes20Package();
      if (result.success) {
        const updatedState = await syncPurchasedCredits(
          installationId,
          20,
          undefined,
          undefined,
          result.transactionId
        );
        updateEntitlements(updatedState);
        Alert.alert('Thank You', '20 Field Note credits have been added to your notebook.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result.error !== 'cancelled') {
        Alert.alert('Purchase', result.error || 'Unable to complete purchase.');
      }
    } catch (err: any) {
      console.warn('[Paywall] Purchase error:', err);
      Alert.alert('Purchase', err.message || 'Payment failed.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleMainCTA = () => {
    if (selectedPlan === 'lifetime') {
      handlePurchaseLifetime();
    } else {
      handlePurchase20();
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.isPro) {
        updateEntitlements({ isPro: true, entitlement: 'pro' });
        Alert.alert('Purchases Restored', 'Your Fields Pro access has been verified and restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result.success) {
        Alert.alert('Purchases Restored', 'Purchases checked. No active Pro access found.');
      } else {
        Alert.alert('Restore Purchases', result.error || 'Could not restore purchases.');
      }
    } catch (e: any) {
      Alert.alert('Restore Purchases', e.message || 'Restore failed.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.overlayPress} onPress={handleDismiss} />

      <View style={styles.modalContainer}>
        {/* Top Notch Pill */}
        <View style={styles.notch} />

        {/* Header Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close paywall"
          >
            <Ionicons name="close" size={20} color={colors.inkSecondary} />
          </Pressable>

          <View style={styles.titleGroup}>
            <TypewriterText size="sm" bold color={colors.charcoal} letterSpacing={2}>
              FIELD NOTES
            </TypewriterText>
            <View style={styles.proBadge}>
              <TypewriterText size="xs" bold color={colors.oxblood}>
                PRO ARCHIVE
              </TypewriterText>
            </View>
          </View>

          <Pressable
            onPress={handleRestore}
            disabled={isRestoring}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            <TypewriterText size="xs" color={colors.inkSecondary} style={styles.restoreLink}>
              {isRestoring ? 'Checking...' : 'Restore'}
            </TypewriterText>
          </Pressable>
        </View>

        {/* Scrollable Content Body */}
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Hero Exhibition Carousel */}
          <View style={styles.heroBox}>
            <View style={styles.heroHeaderRow}>
              <TypewriterText size="xs" color={colors.inkSecondary} bold letterSpacing={1}>
                ACTUAL FIELD NOTE OUTPUTS
              </TypewriterText>
              <View style={styles.counterPill}>
                <TypewriterText size="xs" bold color={colors.oxblood}>
                  {activeSlide + 1} OF {SAMPLE_PLATES.length}
                </TypewriterText>
              </View>
            </View>

            {/* Horizontal Snap Carousel */}
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              snapToAlignment="center"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.carouselContainer}
            >
              {SAMPLE_PLATES.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.plateCard,
                    idx === SAMPLE_PLATES.length - 1 && { marginRight: 0 },
                  ]}
                >
                  <Image source={item.image} style={styles.plateImage} resizeMode="contain" />
                </View>
              ))}
            </ScrollView>

            {/* Carousel Pagination & Caption */}
            <View style={styles.carouselFooter}>
              <View style={styles.dotsRow}>
                {SAMPLE_PLATES.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === activeSlide ? styles.activeDot : styles.inactiveDot,
                    ]}
                  />
                ))}
              </View>
              <TypewriterText size="xs" color={colors.inkSecondary}>
                {SAMPLE_PLATES[activeSlide].title} · {SAMPLE_PLATES[activeSlide].number}
              </TypewriterText>
            </View>
          </View>

          {/* Headline & Value Hook */}
          <View style={styles.headlineBox}>
            <TypewriterText size="xl" bold color={colors.charcoal} letterSpacing={1.5} style={styles.headline}>
              PRESERVE EVERY JOURNEY
            </TypewriterText>
            <TypewriterText size="sm" color={colors.inkSecondary} style={styles.subtitle}>
              Turn photos into hand-pressed 4:3 dual-panel field plates with custom carved rubber stamp art.
            </TypewriterText>
          </View>

          {/* Value Props Box */}
          <View style={styles.featuresBox}>
            <View style={styles.featureItem}>
              <TypewriterText size="sm" bold color={colors.oxblood} style={styles.featureBullet}>
                ✦
              </TypewriterText>
              <View style={styles.featureTextWrapper}>
                <TypewriterText size="xs" bold color={colors.charcoal}>
                  Bespoke Carved Stamp per Photo
                </TypewriterText>
                <TypewriterText size="xs" color={colors.inkSecondary} style={styles.featureDesc}>
                  Every scene extracts 2–4 spot inks into a custom linocut rubber stamp.
                </TypewriterText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <TypewriterText size="sm" bold color={colors.oxblood} style={styles.featureBullet}>
                ✦
              </TypewriterText>
              <View style={styles.featureTextWrapper}>
                <TypewriterText size="xs" bold color={colors.charcoal}>
                  Archival 4:3 Fine Art Dual-Plate
                </TypewriterText>
                <TypewriterText size="xs" color={colors.inkSecondary} style={styles.featureDesc}>
                  Preserves your original photo alongside typewriter field notes and entry number.
                </TypewriterText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <TypewriterText size="sm" bold color={colors.oxblood} style={styles.featureBullet}>
                ✦
              </TypewriterText>
              <View style={styles.featureTextWrapper}>
                <TypewriterText size="xs" bold color={colors.charcoal}>
                  Zero Subscriptions Ever
                </TypewriterText>
                <TypewriterText size="xs" color={colors.inkSecondary} style={styles.featureDesc}>
                  Pure one-time purchase. No monthly fees, renewals, or surprises.
                </TypewriterText>
              </View>
            </View>
          </View>

          {/* Plan Selection Cards */}
          <View style={styles.plansContainer}>
            {/* Card 1: Lifetime Collector (Featured) */}
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'lifetime' ? styles.planCardSelected : styles.planCardUnselected,
              ]}
              onPress={() => handleSelectPlan('lifetime')}
            >
              {/* Badge */}
              <View style={styles.bestValueBadge}>
                <TypewriterText size="xs" bold color="#FFFFFF" letterSpacing={1}>
                  BEST VALUE · UNLIMITED
                </TypewriterText>
              </View>

              <View style={styles.planContentRow}>
                <View style={styles.radioGroup}>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPlan === 'lifetime' && styles.radioCircleActive,
                    ]}
                  >
                    {selectedPlan === 'lifetime' && <View style={styles.radioInnerDot} />}
                  </View>
                  <View style={styles.planInfo}>
                    <TypewriterText size="sm" bold color={colors.charcoal}>
                      Lifetime Collector
                    </TypewriterText>
                    <TypewriterText size="xs" color={colors.inkSecondary} style={styles.planSub}>
                      Unlimited notes forever · Never buy credits
                    </TypewriterText>
                  </View>
                </View>

                <View style={styles.priceColumn}>
                  <TypewriterText size="lg" bold color={colors.charcoal}>
                    $29.99
                  </TypewriterText>
                  <TypewriterText size="xs" color={colors.inkMuted}>
                    one-time
                  </TypewriterText>
                </View>
              </View>
            </Pressable>

            {/* Card 2: 20-Pack */}
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'pack20' ? styles.planCardSelected : styles.planCardUnselected,
              ]}
              onPress={() => handleSelectPlan('pack20')}
            >
              <View style={styles.planContentRow}>
                <View style={styles.radioGroup}>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPlan === 'pack20' && styles.radioCircleActive,
                    ]}
                  >
                    {selectedPlan === 'pack20' && <View style={styles.radioInnerDot} />}
                  </View>
                  <View style={styles.planInfo}>
                    <TypewriterText size="sm" bold color={colors.charcoal}>
                      20 Field Notes Pack
                    </TypewriterText>
                    <TypewriterText size="xs" color={colors.inkSecondary} style={styles.planSub}>
                      $0.15 / note · Perfect for 1 trip
                    </TypewriterText>
                  </View>
                </View>

                <View style={styles.priceColumn}>
                  <TypewriterText size="lg" bold color={colors.charcoal}>
                    $2.99
                  </TypewriterText>
                  <TypewriterText size="xs" color={colors.inkMuted}>
                    one-time
                  </TypewriterText>
                </View>
              </View>
            </Pressable>
          </View>

          {/* Primary Action Button */}
          <View style={styles.actionSection}>
            <StampButton
              title={
                selectedPlan === 'lifetime'
                  ? 'UNLOCK LIFETIME ACCESS — $29.99'
                  : 'BUY 20 NOTES PACK — $2.99'
              }
              onPress={handleMainCTA}
              variant="primary"
              loading={isPurchasing}
              style={styles.ctaButton}
            />

            <View style={styles.dismissRow}>
              <Pressable onPress={handleDismiss} hitSlop={10}>
                <TypewriterText size="xs" color={colors.inkMuted} style={styles.dismissText}>
                  Maybe later
                </TypewriterText>
              </Pressable>
            </View>
          </View>

          {/* Legal Footer */}
          <View style={styles.legalFooter}>
            <TypewriterText size="xs" color={colors.inkMuted} style={styles.legalNotice}>
              One-time purchase · Family Sharing supported
            </TypewriterText>
            <View style={styles.legalLinksRow}>
              <Pressable onPress={() => Linking.openURL(`${getApiBaseUrl()}/terms`)}>
                <TypewriterText size="xs" color={colors.inkMuted} style={styles.legalLink}>
                  Terms of Use
                </TypewriterText>
              </Pressable>
              <TypewriterText size="xs" color={colors.inkMuted} style={styles.legalDot}>
                ·
              </TypewriterText>
              <Pressable onPress={() => Linking.openURL(`${getApiBaseUrl()}/privacy`)}>
                <TypewriterText size="xs" color={colors.inkMuted} style={styles.legalLink}>
                  Privacy Policy
                </TypewriterText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.72)',
    justifyContent: 'flex-end',
  },
  overlayPress: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.92,
    borderTopWidth: 1,
    borderColor: colors.paperBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
    overflow: 'hidden',
  },
  notch: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.paperDark,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: MODAL_PADDING,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.paperBorder,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.paperDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    alignItems: 'center',
    gap: 2,
  },
  proBadge: {
    backgroundColor: 'rgba(136, 48, 37, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  restoreLink: {
    textDecorationLine: 'underline',
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: MODAL_PADDING,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
  },

  // Hero Section
  heroBox: {
    backgroundColor: colors.paperDark,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    marginBottom: spacing.md,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  counterPill: {
    backgroundColor: 'rgba(136, 48, 37, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  carouselContainer: {
    alignItems: 'center',
    gap: CARD_GAP,
    paddingVertical: 4,
  },
  plateCard: {
    width: CARD_WIDTH,
    aspectRatio: layout.posterAspectRatio,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.paperBorder,
    overflow: 'hidden',
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  plateImage: {
    width: '100%',
    height: '100%',
  },
  carouselFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  activeDot: {
    width: 20,
    backgroundColor: colors.charcoal,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: colors.inkLight,
  },

  // Headline
  headlineBox: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  headline: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },

  // Features Box
  featuresBox: {
    backgroundColor: '#FAF7F0',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureBullet: {
    marginTop: 1,
  },
  featureTextWrapper: {
    flex: 1,
    gap: 1,
  },
  featureDesc: {
    lineHeight: 16,
  },

  // Plans Container
  plansContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  planCard: {
    borderRadius: 14,
    padding: spacing.md,
    position: 'relative',
  },
  planCardSelected: {
    backgroundColor: '#FAF6EE',
    borderWidth: 2,
    borderColor: colors.charcoal,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  planCardUnselected: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: colors.paperBorder,
    opacity: 0.88,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: colors.oxblood,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radioGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.inkSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.charcoal,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.charcoal,
  },
  planInfo: {
    flex: 1,
  },
  planSub: {
    marginTop: 2,
  },
  priceColumn: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },

  // Actions
  actionSection: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  ctaButton: {
    minHeight: 52,
  },
  dismissRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dismissText: {
    textDecorationLine: 'underline',
  },

  // Legal
  legalFooter: {
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  legalNotice: {
    textAlign: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
  legalDot: {
    marginHorizontal: 4,
  },
});
