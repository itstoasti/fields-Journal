import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TypewriterText, StampButton } from '../../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';

export default function PrivacyConsentModal() {
  const router = useRouter();
  const setPrivacyConsent = useAppStore((state) => state.setPrivacyConsent);

  const handleContinue = async () => {
    await setPrivacyConsent(true);
    router.back();
  };

  const handleOpenPrivacy = () => {
    router.replace('/privacy');
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        {/* Notch */}
        <View style={styles.notch} />

        <View style={styles.header}>
          <TypewriterText size="lg" bold color={colors.charcoal} letterSpacing={2}>
            FIELD NOTICE
          </TypewriterText>
        </View>

        <View style={styles.messageBox}>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.messageText}>
            Your photo is sent to create this note. It is not used to train models and is not kept on our server after the note is made.
          </TypewriterText>
        </View>

        <View style={styles.buttonsContainer}>
          <StampButton
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            style={styles.continueBtn}
          />

          <Pressable onPress={handleOpenPrivacy} style={styles.linkButton}>
            <TypewriterText size="xs" color={colors.inkSecondary} style={styles.linkText}>
              Read Full Privacy Policy
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
  messageBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    borderRadius: layout.borderRadius,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  messageText: {
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonsContainer: {
    gap: spacing.md,
  },
  continueBtn: {
    minHeight: 52,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});
