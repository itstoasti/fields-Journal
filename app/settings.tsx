import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PaperContainer, TypewriterText, StampButton } from '../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';
import { restorePurchases } from '../src/lib/purchases';

export default function SettingsScreen() {
  const router = useRouter();
  const entitlements = useAppStore((state) => state.entitlements);
  const installationId = useAppStore((state) => state.installationId);
  const selectedModel = useAppStore((state) => state.selectedModel);
  const setSelectedModel = useAppStore((state) => state.setSelectedModel);
  const clearAllNotes = useAppStore((state) => state.clearAllNotes);
  const syncWithBackend = useAppStore((state) => state.syncWithBackend);

  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    const result = await restorePurchases();
    await syncWithBackend();
    setIsRestoring(false);

    if (result.success) {
      Alert.alert('Purchases Restored', 'Your purchases have been verified and restored.');
    } else {
      Alert.alert('Restore Purchases', result.error || 'No previous purchases found.');
    }
  };

  const handleClearAllNotes = () => {
    Alert.alert(
      'Delete Local Notes',
      'Are you sure you want to delete all locally saved notes? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllNotes();
            Alert.alert('Notes Cleared', 'All local note records have been removed.');
          },
        },
      ]
    );
  };

  const handleOpenPrivacy = () => {
    router.push('/privacy');
  };

  const handleOpenPaywall = () => {
    router.push('/modal/paywall');
  };

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
          SETTINGS
        </TypewriterText>

        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Entitlements / Credits Card */}
        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5}>
            ALLOWANCE & CREDITS
          </TypewriterText>

          <View style={styles.balanceRow}>
            <View>
              <TypewriterText size="xxl" bold color={colors.charcoal}>
                {entitlements.credits}
              </TypewriterText>
              <TypewriterText size="xs" color={colors.inkSecondary}>
                Purchased Credits Remaining
              </TypewriterText>
            </View>

            <StampButton
              title="Get Credits"
              onPress={handleOpenPaywall}
              variant="primary"
              style={styles.getCreditsBtn}
              textStyle={styles.getCreditsText}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.freeStatsRow}>
            <TypewriterText size="xs" color={colors.inkSecondary}>
              Free notes used: {entitlements.freeUsed} / 2
            </TypewriterText>
            <TypewriterText size="xs" color={colors.inkSecondary}>
              Ad note used: {entitlements.adUsed ? 'Yes' : 'No'}
            </TypewriterText>
          </View>
        </View>

        {/* AI Generation Model Selector */}
        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5}>
            AI GENERATION MODEL
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkMuted} style={{ marginTop: 4, marginBottom: spacing.md }}>
            Select the xAI Grok model for rendering travel stamps:
          </TypewriterText>

          {[
            {
              id: 'grok-imagine-image-2.0',
              label: 'grok-imagine-image-2.0 (High Quality)',
              subtitle: 'xAI Grok · 2K resolution standard quality (~5-6¢)',
            },
            {
              id: 'grok-imagine-image-2.0-low',
              label: 'grok-imagine-image-2.0 (2K Low)',
              subtitle: 'xAI Grok · Fast 2K low compute tier (~2-3¢)',
            },
            {
              id: 'gemini-2.5-flash-image',
              label: 'Gemini 2.5 Flash Image (Nano Banana)',
              subtitle: 'Google Gemini · Ultra-fast generative multimodal',
            },
            {
              id: 'gemini-3.1-flash-image',
              label: 'Gemini 3.1 Flash Image (Nano Banana 2)',
              subtitle: 'Google Gemini · Next-gen multimodal image synthesis',
            },
          ].map((m, index) => {
            const isSelected = (selectedModel || 'grok-imagine-image-2.0') === m.id;
            return (
              <React.Fragment key={m.id}>
                {index > 0 && <View style={styles.divider} />}
                <Pressable
                  onPress={() => setSelectedModel(m.id)}
                  style={styles.modelRow}
                >
                  <View style={styles.listTextContainer}>
                    <TypewriterText size="sm" bold={isSelected} color={isSelected ? colors.brickRed : colors.charcoal}>
                      {m.label}
                    </TypewriterText>
                    <TypewriterText size="xs" color={colors.inkSecondary}>
                      {m.subtitle}
                    </TypewriterText>
                  </View>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? colors.brickRed : colors.inkMuted}
                  />
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* Purchase Operations */}
        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5}>
            PURCHASE MANAGEMENT
          </TypewriterText>

          <Pressable
            onPress={handleRestorePurchases}
            disabled={isRestoring}
            style={styles.listItem}
          >
            <View style={styles.listTextContainer}>
              <TypewriterText size="sm" color={colors.charcoal}>
                Restore Purchases
              </TypewriterText>
              <TypewriterText size="xs" color={colors.inkSecondary}>
                Re-sync credits from Google Play
              </TypewriterText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSecondary} />
          </Pressable>
        </View>

        {/* Data & Privacy */}
        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5}>
            DATA & PRIVACY
          </TypewriterText>

          <Pressable onPress={handleOpenPrivacy} style={styles.listItem}>
            <View style={styles.listTextContainer}>
              <TypewriterText size="sm" color={colors.charcoal}>
                Privacy Policy & Data Safety
              </TypewriterText>
              <TypewriterText size="xs" color={colors.inkSecondary}>
                Learn how your photos are processed
              </TypewriterText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSecondary} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={handleClearAllNotes} style={styles.listItem}>
            <View style={styles.listTextContainer}>
              <TypewriterText size="sm" color={colors.error}>
                Delete Local Notes
              </TypewriterText>
              <TypewriterText size="xs" color={colors.inkSecondary}>
                Remove all saved field notes from this device
              </TypewriterText>
            </View>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        </View>

        {/* App Info */}
        <View style={styles.infoBox}>
          <TypewriterText size="xs" color={colors.inkMuted} style={styles.infoText}>
            FIELDS v1.0.0 · TRAVEL JOURNAL & STAMPS
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkMuted} style={styles.infoText}>
            Installation ID: {installationId.slice(0, 16)}…
          </TypewriterText>
        </View>
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
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  getCreditsBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  getCreditsText: {
    fontSize: 13,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.paperBorder,
    marginVertical: spacing.md,
  },
  freeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  listTextContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  infoBox: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  infoText: {
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
});
