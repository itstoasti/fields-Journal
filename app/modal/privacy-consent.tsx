import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TypewriterText, StampButton } from '../../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import { getApiBaseUrl } from '../../src/lib/api';

export default function PrivacyConsentModal() {
  const router = useRouter();
  const setPrivacyConsent = useAppStore((state) => state.setPrivacyConsent);

  const handleContinue = async () => {
    await setPrivacyConsent(true);
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  const handleOpenPrivacy = () => {
    router.push('/privacy');
  };

  const handleOpenTerms = () => {
    const url = `${getApiBaseUrl()}/terms`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCancel} />
      <View style={styles.sheet}>
        {/* Notch */}
        <View style={styles.notch} />

        <View style={styles.badgeRow}>
          <View style={styles.badgePill}>
            <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.2}>
              ✦ AI &amp; DATA TRANSPARENCY ✦
            </TypewriterText>
          </View>
        </View>

        <View style={styles.header}>
          <TypewriterText size="md" bold color={colors.charcoal} letterSpacing={2}>
            FIELD NOTICE &amp; CONSENT
          </TypewriterText>
        </View>

        <View style={styles.messageBox}>
          <TypewriterText size="xs" bold color={colors.charcoal} style={styles.bulletTitle}>
            Generative AI &amp; Photo Processing:
          </TypewriterText>
          <TypewriterText size="xs" color={colors.charcoal} style={styles.messageText}>
            Fields uses generative AI (powered by Google Gemini) to transform your photo into an artistic linocut stamp and craft your field note entry.
          </TypewriterText>

          <View style={styles.bulletItem}>
            <TypewriterText size="xs" bold color={colors.charcoal}>
              • Privacy First:
            </TypewriterText>
            <TypewriterText size="xs" color={colors.inkSecondary} style={styles.bulletText}>
              Your photo is processed transiently in memory to generate your note. It is never stored on our servers and is never used to train AI models.
            </TypewriterText>
          </View>

          <View style={styles.bulletItem}>
            <TypewriterText size="xs" bold color={colors.charcoal}>
              • Content Safety:
            </TypewriterText>
            <TypewriterText size="xs" color={colors.inkSecondary} style={styles.bulletText}>
              All AI outputs are filtered to prevent harmful content. You can flag or report any inappropriate result directly from the result screen.
            </TypewriterText>
          </View>
        </View>

        <View style={styles.termsNotice}>
          <TypewriterText size="xs" color={colors.inkMuted} style={styles.termsText}>
            By continuing, you agree to our Terms of Service (Apple EULA) and Privacy Policy.
          </TypewriterText>
        </View>

        <View style={styles.buttonsContainer}>
          <StampButton
            title="Agree & Continue"
            onPress={handleContinue}
            variant="primary"
            style={styles.continueBtn}
          />
          <StampButton
            title="Not Now"
            onPress={handleCancel}
            variant="secondary"
            style={styles.cancelBtn}
          />

          <View style={styles.legalLinksRow}>
            <Pressable onPress={handleOpenPrivacy} hitSlop={8}>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.linkText}>
                Privacy Policy
              </TypewriterText>
            </Pressable>
            <TypewriterText size="xs" color={colors.inkMuted}>
              ·
            </TypewriterText>
            <Pressable onPress={handleOpenTerms} hitSlop={8}>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.linkText}>
                Terms &amp; EULA
              </TypewriterText>
            </Pressable>
          </View>
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
    marginBottom: spacing.md,
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgePill: {
    backgroundColor: '#E5DFC9',
    borderColor: '#D0C4AF',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  messageBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bulletTitle: {
    marginBottom: 4,
  },
  messageText: {
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  bulletItem: {
    marginTop: 6,
  },
  bulletText: {
    lineHeight: 16,
    marginTop: 2,
  },
  termsNotice: {
    marginBottom: spacing.md,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  termsText: {
    textAlign: 'center',
    lineHeight: 16,
  },
  buttonsContainer: {
    gap: spacing.sm,
  },
  continueBtn: {
    minHeight: 48,
  },
  cancelBtn: {
    minHeight: 42,
  },
  legalLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});
