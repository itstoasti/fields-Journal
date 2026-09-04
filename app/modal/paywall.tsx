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
import { buyNotes20Package } from '../../src/lib/purchases';
import { syncPurchasedCredits, getApiBaseUrl } from '../../src/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PaywallModal() {
  const router = useRouter();
  const installationId = useAppStore((state) => state.installationId);
  const updateEntitlements = useAppStore((state) => state.updateEntitlements);

  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async () => {
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
            Get more notes
          </TypewriterText>
          <TypewriterText size="sm" color={colors.inkSecondary} style={styles.subtitle}>
            20 field notes. No ads.
          </TypewriterText>
        </View>

        <View style={styles.detailsBox}>
          <TypewriterText size="xs" color={colors.inkSecondary} style={styles.bulletPoint}>
            • 20 high-fidelity rubber stamp generations
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkSecondary} style={styles.bulletPoint}>
            • No advertisements, ever
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkSecondary} style={styles.bulletPoint}>
            • Credits never expire
          </TypewriterText>
        </View>

        <View style={styles.buttonsContainer}>
          <StampButton
            title="Buy 20 notes — $2.99"
            onPress={handlePurchase}
            variant="primary"
            loading={isPurchasing}
            style={styles.buyButton}
          />

          <StampButton
            title="Not now"
            onPress={handleDismiss}
            variant="ghost"
            style={styles.cancelButton}
          />
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
    marginBottom: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  detailsBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  bulletPoint: {
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  buttonsContainer: {
    gap: spacing.xs,
  },
  buyButton: {
    minHeight: 52,
  },
  cancelButton: {
    minHeight: 44,
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
