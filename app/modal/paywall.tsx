import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TypewriterText, StampButton } from '../../src/components';
import { colors, fonts, layout, spacing } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import {
  buyLifetimePackage,
  buyNotes20Package,
  restorePurchases,
} from '../../src/lib/purchases';
import { syncPurchasedCredits, getApiBaseUrl } from '../../src/lib/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_PADDING = spacing.lg;

// Card dimensions for the fanned-out fine-art hero
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.52, 205);
const CARD_HEIGHT = CARD_WIDTH * (3 / 4);

const POSTER_KYOTO = require('../../assets/posters/poster_kyoto.jpg');
const POSTER_YOSEMITE = require('../../assets/posters/poster_yosemite.jpg');
const POSTER_AMALFI = require('../../assets/posters/poster_amalfi.jpg');

export default function PaywallModal() {
  const router = useRouter();
  const installationId = useAppStore((state) => state.installationId);
  const updateEntitlements = useAppStore((state) => state.updateEntitlements);

  const [topCard, setTopCard] = useState<'kyoto' | 'yosemite' | 'amalfi'>('kyoto');
  const [selectedPlan, setSelectedPlan] = useState<'lifetime' | 'pack20'>('lifetime');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleCardTap = (card: 'kyoto' | 'yosemite' | 'amalfi') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setTopCard(card);
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

          <TypewriterText size="sm" bold color={colors.charcoal} letterSpacing={2}>
            EXPAND YOUR JOURNAL
          </TypewriterText>

          <Pressable
            onPress={handleRestore}
            disabled={isRestoring}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            <TypewriterText size="xs" color={colors.inkSecondary} style={styles.restoreLink}>
              {isRestoring ? 'Restoring...' : 'Restore'}
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
          {/* Fanned-Out Fine-Art Prints Hero */}
          <View style={styles.fanHeroContainer}>
            {/* Left Card: Yosemite Valley (Rotated -8deg) */}
            <Pressable
              onPress={() => handleCardTap('yosemite')}
              style={[
                styles.fanCard,
                styles.fanCardLeft,
                { zIndex: topCard === 'yosemite' ? 30 : 10 },
              ]}
            >
              <Image source={POSTER_YOSEMITE} style={styles.cardImage} resizeMode="cover" />
            </Pressable>

            {/* Right Card: Amalfi Coast (Rotated +8deg) */}
            <Pressable
              onPress={() => handleCardTap('amalfi')}
              style={[
                styles.fanCard,
                styles.fanCardRight,
                { zIndex: topCard === 'amalfi' ? 30 : 20 },
              ]}
            >
              <Image source={POSTER_AMALFI} style={styles.cardImage} resizeMode="cover" />
            </Pressable>

            {/* Center Card: Kyoto Old District */}
            <Pressable
              onPress={() => handleCardTap('kyoto')}
              style={[
                styles.fanCard,
                styles.fanCardCenter,
                { zIndex: topCard === 'kyoto' ? 30 : 25 },
              ]}
            >
              <Image source={POSTER_KYOTO} style={styles.cardImage} resizeMode="cover" />
            </Pressable>
          </View>

          {/* Sub-badge */}
          <View style={styles.subBadgeRow}>
            <View style={styles.subBadgePill}>
              <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1}>
                ✦ 4:3 FINE ART DUAL-PLATES · HAND-PRESSED ✦
              </TypewriterText>
            </View>
          </View>

          {/* Headline & Editorial Hook */}
          <View style={styles.headlineBox}>
            <TypewriterText size="xl" bold color={colors.charcoal} style={styles.headline}>
              Every Journey Deserves a Timeless Print
            </TypewriterText>
            <TypewriterText size="xs" color={colors.inkSecondary} style={styles.subtitle}>
              Transform your travel photos into bespoke hand-pressed linocut field notes.
            </TypewriterText>
          </View>

          {/* High-Converting Benefits Card */}
          <View style={styles.benefitsCard}>
            {/* Header Tag */}
            <View style={styles.benefitsHeader}>
              <View style={styles.benefitsBadge}>
                <Ionicons name="sparkles" size={12} color={colors.oxblood} style={{ marginRight: 4 }} />
                <TypewriterText size="xs" bold color={colors.oxblood} letterSpacing={1}>
                  WHY TRAVELERS UPGRADE
                </TypewriterText>
              </View>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.benefitsGuarantee}>
                Full Studio Edition
              </TypewriterText>
            </View>

            {/* Benefit 1: Unlimited */}
            <View style={styles.benefitRow}>
              <View style={styles.iconBadge}>
                <Ionicons name="infinite" size={18} color={colors.oxblood} />
              </View>
              <View style={styles.benefitTextCol}>
                <View style={styles.benefitTitleRow}>
                  <TypewriterText size="xs" bold color={colors.charcoal}>
                    Unlimited Creations for Life
                  </TypewriterText>
                  <View style={styles.tagPill}>
                    <TypewriterText size="xs" bold color="#FFFFFF">
                      UNLIMITED
                    </TypewriterText>
                  </View>
                </View>
                <TypewriterText size="xs" color={colors.inkSecondary} style={styles.benefitCopy}>
                  Never ration credits again. Press entire vacations, weekend road trips, and daily adventures without limits.
                </TypewriterText>
              </View>
            </View>

            <View style={styles.benefitDivider} />

            {/* Benefit 2: Bespoke Linocut */}
            <View style={styles.benefitRow}>
              <View style={styles.iconBadge}>
                <Ionicons name="color-palette" size={17} color={colors.oxblood} />
              </View>
              <View style={styles.benefitTextCol}>
                <TypewriterText size="xs" bold color={colors.charcoal}>
                  Bespoke Hand-Carved Stamp Art
                </TypewriterText>
                <TypewriterText size="xs" color={colors.inkSecondary} style={styles.benefitCopy}>
                  Not a generic filter. Every photo is individually analyzed to carve a multi-color rubber stamp unique to your scene.
                </TypewriterText>
              </View>
            </View>

            <View style={styles.benefitDivider} />

            {/* Benefit 3: Archival Prints */}
            <View style={styles.benefitRow}>
              <View style={styles.iconBadge}>
                <Ionicons name="image" size={17} color={colors.oxblood} />
              </View>
              <View style={styles.benefitTextCol}>
                <TypewriterText size="xs" bold color={colors.charcoal}>
                  Museum-Grade 4K Dual-Plates
                </TypewriterText>
                <TypewriterText size="xs" color={colors.inkSecondary} style={styles.benefitCopy}>
                  Archival 4:3 prints complete with location & typewriter notes. Calibrated for fine-art framing or camera roll export.
                </TypewriterText>
              </View>
            </View>

            <View style={styles.benefitDivider} />

            {/* Benefit 4: Zero Subscriptions */}
            <View style={styles.benefitRow}>
              <View style={styles.iconBadge}>
                <Ionicons name="shield-checkmark" size={17} color={colors.oxblood} />
              </View>
              <View style={styles.benefitTextCol}>
                <TypewriterText size="xs" bold color={colors.charcoal}>
                  Pay Once · Never a Subscription
                </TypewriterText>
                <TypewriterText size="xs" color={colors.inkSecondary} style={styles.benefitCopy}>
                  We hate monthly subscriptions too. One single payment secures unlimited access and all future updates forever.
                </TypewriterText>
              </View>
            </View>
          </View>

          {/* Plan Selection Cards */}
          <View style={styles.plansContainer}>
            {/* Card 1: Lifetime Explorer Pass (Featured) */}
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
                  BEST VALUE · PAY ONCE
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
                      Lifetime Explorer Pass
                    </TypewriterText>
                    <TypewriterText size="xs" color={colors.inkSecondary} style={styles.planSub}>
                      Pay once, own forever · Unlimited notes
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
                  ? 'CLAIM LIFETIME ACCESS — $29.99'
                  : 'GET 20 FIELD NOTES — $2.99'
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
            <View style={styles.legalLinksRow}>
              <Pressable onPress={handleRestore} disabled={isRestoring}>
                <TypewriterText size="xs" color={colors.inkMuted} style={styles.legalLink}>
                  Restore Purchases
                </TypewriterText>
              </Pressable>
              <TypewriterText size="xs" color={colors.inkMuted} style={styles.legalDot}>
                ·
              </TypewriterText>
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
    backgroundColor: 'rgba(28, 25, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  overlayPress: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.94,
    borderTopWidth: 1,
    borderColor: colors.paperBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
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
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.paperDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreLink: {
    textDecorationLine: 'underline',
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: MODAL_PADDING,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
  },

  // Fanned Hero Section
  fanHeroContainer: {
    height: 175,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.xs,
  },
  fanCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8CEBE',
    overflow: 'hidden',
  },
  fanCardLeft: {
    transform: [{ translateX: -38 }, { translateY: 6 }, { rotate: '-9deg' }],
    shadowColor: colors.charcoal,
    shadowOffset: { width: -3, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fanCardRight: {
    transform: [{ translateX: 38 }, { translateY: 6 }, { rotate: '9deg' }],
    shadowColor: colors.charcoal,
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fanCardCenter: {
    width: CARD_WIDTH + 10,
    height: (CARD_WIDTH + 10) * (3 / 4),
    transform: [{ translateX: 0 }, { translateY: -4 }, { rotate: '0deg' }],
    borderWidth: 1.5,
    borderColor: '#C8BCAB',
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },

  subBadgeRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subBadgePill: {
    backgroundColor: '#E8DFC9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5C8AF',
  },

  // Headline
  headlineBox: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  headline: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 320,
  },

  // High-Converting Benefits Card
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#DED5C5',
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8DC',
  },
  benefitsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(156, 61, 40, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(156, 61, 40, 0.18)',
  },
  benefitsGuarantee: {
    fontStyle: 'italic',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 2,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(156, 61, 40, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(156, 61, 40, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  benefitTextCol: {
    flex: 1,
    gap: 2,
  },
  benefitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagPill: {
    backgroundColor: colors.oxblood,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  benefitCopy: {
    lineHeight: 16,
    color: colors.inkSecondary,
  },
  benefitDivider: {
    height: 1,
    backgroundColor: '#F3ECE0',
    marginVertical: spacing.sm,
  },

  // Plans Container
  plansContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  planCard: {
    borderRadius: 16,
    padding: spacing.md,
    position: 'relative',
  },
  planCardSelected: {
    backgroundColor: '#FAF6EE',
    borderWidth: 2,
    borderColor: colors.oxblood,
    shadowColor: colors.oxblood,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
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
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    shadowColor: colors.oxblood,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
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
    borderColor: colors.oxblood,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.oxblood,
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
    marginBottom: spacing.xs,
  },
  ctaButton: {
    minHeight: 54,
    backgroundColor: colors.oxblood,
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
    marginTop: spacing.xs,
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
