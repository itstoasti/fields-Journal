import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PaperContainer, TypewriterText, StampButton } from '../src/components';
import { colors, fontSizes, layout, spacing } from '../src/theme';
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

  useFocusEffect(
    useCallback(() => {
      syncWithBackend();
    }, [syncWithBackend])
  );

  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithBackend();
      const current = useAppStore.getState().entitlements;
      Alert.alert(
        'Account Synced',
        `Live Server Status:\n• Credits Remaining: ${current.credits}\n• Free Notes Used: ${current.freeUsed}/2\n• Rewarded Ad Note Used: ${current.adUsed ? 'Yes' : 'No'}`
      );
    } catch (e: any) {
      Alert.alert('Sync Error', e.message || 'Could not connect to backend server.');
    } finally {
      setIsSyncing(false);
    }
  };

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

  const handleClose = () => {
    router.back();
  };

  return (
    <PaperContainer>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          style={styles.backButton}
          accessibilityLabel="Back to notes"
          accessibilityRole="button"
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.charcoal} />
        </Pressable>

        <TypewriterText size="lg" bold letterSpacing={2} color={colors.charcoal}>
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

          <View style={styles.syncRow}>
            <StampButton
              title={isSyncing ? 'Syncing...' : 'Sync Balance with Server'}
              onPress={handleManualSync}
              variant="secondary"
              loading={isSyncing}
              style={styles.syncBtn}
              textStyle={styles.syncBtnText}
            />
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
              subtitle: 'xAI Grok · 2K standard quality (~5-6¢)',
            },
            {
              id: 'grok-imagine-image-2.0-low',
              label: 'grok-imagine-image-2.0-low (2K Low Compute)',
              subtitle: 'xAI Grok · Low compute tier (~2-3¢)',
            },
            {
              id: 'grok-imagine-image-quality',
              label: 'grok-imagine-image-quality (Ultra HD)',
              subtitle: 'xAI Grok · High detail & texture (~7-8¢)',
            },
          ].map((item) => {
            const isSelected = selectedModel === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedModel(item.id)}
                style={[
                  styles.modelOption,
                  isSelected && styles.modelOptionSelected,
                ]}
              >
                <View style={styles.modelRadioOuter}>
                  {isSelected && <View style={styles.modelRadioInner} />}
                </View>
                <View style={styles.modelTextContainer}>
                  <TypewriterText
                    size="sm"
                    bold={isSelected}
                    color={isSelected ? colors.brickRed : colors.charcoal}
                  >
                    {item.label}
                  </TypewriterText>
                  <TypewriterText size="xs" color={colors.inkMuted} style={{ marginTop: 2 }}>
                    {item.subtitle}
                  </TypewriterText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Notebook Data Management */}
        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5}>
            NOTEBOOK DATA
          </TypewriterText>

          <View style={styles.menuList}>
            <Pressable style={styles.menuItem} onPress={handleRestorePurchases} disabled={isRestoring}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="refresh-outline" size={20} color={colors.charcoal} />
                <TypewriterText size="sm" color={colors.charcoal} style={styles.menuItemText}>
                  {isRestoring ? 'Restoring Purchases...' : 'Restore Purchases'}
                </TypewriterText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.menuItem} onPress={handleClearAllNotes}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="trash-outline" size={20} color={colors.brickRed} />
                <TypewriterText size="sm" color={colors.brickRed} style={styles.menuItemText}>
                  Clear All Saved Notes
                </TypewriterText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </Pressable>
          </View>
        </View>

        {/* Legal & About */}
        <View style={styles.card}>
          <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5}>
            LEGAL & PRIVACY
          </TypewriterText>

          <View style={styles.menuList}>
            <Pressable style={styles.menuItem} onPress={handleOpenPrivacy}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.charcoal} />
                <TypewriterText size="sm" color={colors.charcoal} style={styles.menuItemText}>
                  Privacy & Data Principles
                </TypewriterText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </Pressable>
          </View>
        </View>

        {/* Installation Info */}
        <View style={styles.footerInfo}>
          <TypewriterText size="xs" color={colors.inkMuted} style={styles.footerText}>
            Installation ID: {installationId ? installationId.slice(0, 16) + '...' : 'Loading...'}
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkMuted} style={styles.footerText}>
            FIELDS v1.0.0 · Travel Journal & Stamps
          </TypewriterText>
        </View>
      </ScrollView>
    </PaperContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.paperCard,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  getCreditsBtn: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  getCreditsText: {
    fontSize: fontSizes.xs,
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
  syncRow: {
    marginTop: spacing.md,
  },
  syncBtn: {
    minHeight: 38,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  syncBtnText: {
    fontSize: fontSizes.xs,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modelOptionSelected: {
    backgroundColor: '#ECE3D4',
    borderColor: colors.brickRed,
  },
  modelRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  modelRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brickRed,
  },
  modelTextContainer: {
    flex: 1,
  },
  menuList: {
    marginTop: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuItemText: {
    marginLeft: spacing.xs,
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 4,
  },
  footerText: {
    textAlign: 'center',
  },
});
