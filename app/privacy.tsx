import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PaperContainer, TypewriterText } from '../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../src/theme';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <PaperContainer>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.charcoal} />
        </Pressable>

        <TypewriterText size="md" bold letterSpacing={2}>
          PRIVACY POLICY
        </TypewriterText>

        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5} style={styles.sectionHeader}>
            PHOTO PROCESSING & AI
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            When you choose to generate a Field Note, your selected travel photo is uploaded securely to our backend server for the single purpose of creating your 4:3 Rubber Stamp Poster.
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            Image generation is processed via xAI's image editing technology. Your photos are never used to train machine learning models and are immediately discarded from memory after the poster is generated.
          </TypewriterText>
        </View>

        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5} style={styles.sectionHeader}>
            LOCAL DATA & STORAGE
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            • Your saved Field Notes and posters are stored entirely on your local device.
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            • We do not maintain accounts, logins, or cloud photo backups.
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            • You can delete your local field notes at any time from the Settings menu.
          </TypewriterText>
        </View>

        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5} style={styles.sectionHeader}>
            DEVICE PERMISSIONS
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            • <TypewriterText size="sm" bold color={colors.charcoal}>Photos:</TypewriterText> Used through the Android system photo picker to select images you specifically choose. We do not scan your entire library.
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            • <TypewriterText size="sm" bold color={colors.charcoal}>Camera:</TypewriterText> Used only when you tap 'Camera' to take a new travel photo.
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            • <TypewriterText size="sm" bold color={colors.charcoal}>Storage / Media Library:</TypewriterText> Used only when you tap 'Save' to export your finished poster into your gallery.
          </TypewriterText>
        </View>

        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5} style={styles.sectionHeader}>
            MONETIZATION & ADS
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            • Google Mobile Ads (AdMob) is used solely for the optional rewarded video on Note 3.
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            • In-app purchases are securely processed via Google Play and RevenueCat.
          </TypewriterText>
          <TypewriterText size="sm" color={colors.charcoal} style={styles.paragraph}>
            • Paid users never see ads.
          </TypewriterText>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </PaperContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.paperBorder,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.paperCard,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  paragraph: {
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
});
