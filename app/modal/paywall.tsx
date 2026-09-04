import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PaperContainer, TypewriterText, StampButton } from '../../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import {
  buyNotes20Package,
  presentRevenueCatPaywall,
  restorePurchases,
} from '../../src/lib/purchases';
import { syncPurchasedCredits, getApiBaseUrl } from '../../src/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PaywallModal() {
  const router = useRouter();
  const installationId = useAppStore((state) => state.installationId);
  const entitlements = useAppStore((state) => state.entitlements);
  const updateEntitlements = useAppStore((state) => state.updateEntitlements);

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Present Native RevenueCat UI Paywall
  const handleOpenProPaywall = async () => {
    try {
      const { result, isPro } = await presentRevenueCatPaywall();
      if (isPro) {
        updateEntitlements({ isPro: true, entitlement: 'pro' });
        Alert.alert('Welcome to Pro', 'Thank you for subscribing to Fields Pro! You now have unlimited travel notes.', [
          { text: 'Start Creating', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      console.warn('[Paywall] Pro paywall presentation error:', err);
    }
  };

  // Consumable 20 Notes Pack
  const handlePurchase20 = async () => {
    setIsPurchasing(true);
    try {
      const result = await buyNotes20Package();
      if (result.success) {
        // Sync with backend server
        const updatedState = await syncPurchasedCredits(installationId, 20);
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

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.isPro) {
        updateEntitlements({ isPro: true, entitlement: 'pro' });
        Alert.alert('Purchases Restored', 'Your Fields Pro subscription has been verified and restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result.success) {
        Alert.alert('Purchases Restored', 'Purchases checked. No active Pro subscription found.');
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
      
      <View style={styles.sheet}>
        {/* Top Notch */}
        <View style={styles.notch} />

        <View style={styles.header}>
          <TypewriterText size="xl" bold color={colors.charcoal} letterSpacing={2}>
            EXPAND YOUR JOURNAL
          </TypewriterText>
          <TypewriterText size="sm" color={colors.inkSecondary} style={styles.subtitle}>
            Subscribe for unlimited notes or buy credits as you go
          </TypewriterText>
        </View>

        <View style={styles.detailsBox}>
          <TypewriterText size="xs" color={colors.inkSecondary} style={styles.bulletPoint}>
            • Unlimited rubber stamp generations with Fields Pro
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkSecondary} style={styles.bulletPoint}>
            • Flexible Monthly, Yearly, or Lifetime options
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkSecondary} style={styles.bulletPoint}>
            • Zero ads, high-resolution vintage exports
          </TypewriterText>
        </View>

        <View style={styles.buttonsContainer}>
          <StampButton
            title="UPGRADE TO FIELDS PRO"
            onPress={handleOpenProPaywall}
            variant="primary"
            style={styles.proButton}
          />

          <StampButton
            title="Buy 20 Notes Pack — $2.99"
            onPress={handlePurchase20}
            variant="secondary"
            loading={isPurchasing}
            style={styles.buyButton}
          />

          <View style={styles.restoreRow}>
            <Pressable onPress={handleRestore} disabled={isRestoring} hitSlop={8}>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.restoreText}>
                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
              </TypewriterText>
            </Pressable>
            <TypewriterText size="xs" color={colors.inkMuted}>
              ·
            </TypewriterText>
            <Pressable onPress={handleDismiss} hitSlop={8}>
              <TypewriterText size="xs" color={colors.inkMuted}>
                Not now
              </TypewriterText>
            </Pressable>
          </View>
        </View>

        {/* Store Compliant Legal Links */}
        <View style={styles.legalFooter}>
          <Pressable onPress={() => Linking.openURL(`${getApiBaseUrl()}/terms`)}>
            <TypewriterText size="xs" color={colors.inkMuted} style={styles.legalLink}>
              Terms of Use
            </TypewriterText>
          </Pressable>
          <TypewriterText size="xs" color={colors.inkMuted} style={{ marginHorizontal: 8 }}>
            ·
          </TypewriterText>
          <Pressable onPress={() => Linking.openURL(`${getApiBaseUrl()}/privacy`)}>
            <TypewriterText size="xs" color={colors.inkMuted} style={styles.legalLink}>
              Privacy Policy
            </TypewriterText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.65)',
    justifyContent: 'flex-end',
  },
  overlayPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.paperCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: colors.paperBorder,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.section,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 10,
  },
  notch: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.paperDark,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  detailsBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bulletPoint: {
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  buttonsContainer: {
    gap: spacing.sm,
  },
  proButton: {
    minHeight: 52,
  },
  buyButton: {
    minHeight: 46,
  },
  restoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  restoreText: {
    textDecorationLine: 'underline',
  },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
});
