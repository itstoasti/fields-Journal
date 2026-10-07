import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PaperContainer, TypewriterText, StampButton, FieldAlert } from '../src/components';
import { colors, fonts, fontSizes, layout, spacing } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';
import {
  restorePurchases,
  presentRevenueCatPaywall,
  presentCustomerCenter,
} from '../src/lib/purchases';
import { getApiBaseUrl } from '../src/lib/api';

export default function SettingsScreen() {
  const router = useRouter();
  const entitlements = useAppStore((state) => state.entitlements);
  const installationId = useAppStore((state) => state.installationId);
  const accountKey = useAppStore((state) => state.accountKey);
  const linkAccountWithKey = useAppStore((state) => state.linkAccountWithKey);
  const clearAllNotes = useAppStore((state) => state.clearAllNotes);
  const syncWithBackend = useAppStore((state) => state.syncWithBackend);

  useFocusEffect(
    useCallback(() => {
      syncWithBackend();
    }, [syncWithBackend])
  );

  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithBackend();
      const current = useAppStore.getState().entitlements;
      FieldAlert.alert(
        'Account Synced',
        `Live Server Status:\n• Credits Remaining: ${current.credits}\n• Free Notes Used: ${current.freeUsed}/2\n• Rewarded Ad Note Used: ${current.adUsed ? 'Yes' : 'No'}`
      );
    } catch (e: any) {
      FieldAlert.alert('Sync Error', e.message || 'Could not connect to backend server.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenSubscriptionPaywall = async () => {
    try {
      const { isPro } = await presentRevenueCatPaywall();
      if (isPro) {
        useAppStore.getState().updateEntitlements({ isPro: true, entitlement: 'pro' });
        FieldAlert.alert('Fields Pro', 'You are now subscribed to Fields Pro! Enjoy unlimited travel notes.');
      }
    } catch (e: any) {
      console.warn('[Settings] Pro paywall error:', e);
    }
  };

  const handleOpenPaywall = () => {
    router.push('/modal/paywall');
  };

  const handleOpenCustomerCenter = async () => {
    await presentCustomerCenter();
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.isPro) {
        useAppStore.getState().updateEntitlements({ isPro: true, entitlement: 'pro' });
      }
      await syncWithBackend();
      if (result.isPro) {
        FieldAlert.alert('Purchases Restored', 'Your Fields Pro subscription has been verified and restored.');
      } else if (result.success) {
        FieldAlert.alert('Purchases Restored', 'Purchases checked. Restored any active entitlements.');
      } else {
        FieldAlert.alert('Restore Purchases', result.error || 'No previous purchases found.');
      }
    } catch (err: any) {
      FieldAlert.alert('Restore Purchases', err.message || 'Error restoring purchases.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClearAllNotes = () => {
    FieldAlert.alert(
      'Delete Local Notes',
      'Are you sure you want to delete all locally saved notes? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllNotes();
            FieldAlert.alert('Notes Cleared', 'All local note records have been removed.');
          },
        },
      ]
    );
  };

  const handleOpenPrivacy = () => {
    router.push('/privacy');
  };

  const handleOpenWebPrivacy = () => {
    const baseUrl = getApiBaseUrl();
    Linking.openURL(`${baseUrl}/privacy`).catch(() => {
      FieldAlert.alert('Notice', 'Unable to open Privacy Policy web page.');
    });
  };

  const handleOpenWebTerms = () => {
    const baseUrl = getApiBaseUrl();
    Linking.openURL(`${baseUrl}/terms`).catch(() => {
      FieldAlert.alert('Notice', 'Unable to open Terms of Service web page.');
    });
  };

  const handleOpenAbout = () => {
    if (Platform.OS === 'web') {
      window.location.href = '/';
      return;
    }
    const baseUrl = getApiBaseUrl();
    Linking.openURL(`${baseUrl}/about`).catch(() => {
      FieldAlert.alert('Notice', 'Unable to open About page.');
    });
  };

  const handleCopyKey = async () => {
    if (!accountKey) {
      FieldAlert.alert('Notice', 'Generating your account key, please wait a moment...');
      return;
    }
    let success = false;
    try {
      const Clipboard = require('expo-clipboard');
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(accountKey);
        success = true;
      }
    } catch {}

    if (!success && Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(accountKey);
        success = true;
      } catch {}
    }

    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } else {
      FieldAlert.alert('Your Account Key', accountKey);
    }
  };

  const handleLinkAccount = async () => {
    const clean = inputKey.trim().toUpperCase();
    if (!clean) {
      FieldAlert.alert('Notice', 'Please enter your Account Key.');
      return;
    }
    setIsLinking(true);
    const result = await linkAccountWithKey(clean);
    setIsLinking(false);
    if (result.success) {
      setShowLinkModal(false);
      setInputKey('');
      FieldAlert.alert(
        'Account Linked',
        'Your purchased credits and account status are now linked and active on this device.'
      );
    } else {
      FieldAlert.alert('Link Error', result.message || 'Could not link this Account Key.');
    }
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
        {/* Membership & Subscription Card */}
        <View style={styles.card}>
          <View style={styles.membershipHeader}>
            <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5}>
              MEMBERSHIP & SUBSCRIPTION
            </TypewriterText>
            <View
              style={[
                styles.statusBadge,
                entitlements.isPro ? styles.statusBadgePro : styles.statusBadgeFree,
              ]}
            >
              <TypewriterText
                size="xs"
                bold
                color={entitlements.isPro ? colors.brickRed : colors.inkMuted}
              >
                {entitlements.isPro ? 'PRO ACTIVE' : 'FREE TIER'}
              </TypewriterText>
            </View>
          </View>

          <TypewriterText size="sm" bold color={colors.charcoal} style={{ marginTop: spacing.xs }}>
            {entitlements.isPro
              ? 'Fields Pro: Unlimited Journal Notes'
              : 'Upgrade to Fields Pro for Unlimited Notes'}
          </TypewriterText>

          <TypewriterText
            size="xs"
            color={colors.inkSecondary}
            style={{ marginTop: 4, marginBottom: spacing.md }}
          >
            {entitlements.isPro
              ? 'Includes unlimited AI stamp carving, ad-free experience, and high-res exports.'
              : 'Choose Monthly, Yearly, or Lifetime options with flexible cancellation.'}
          </TypewriterText>

          {entitlements.isPro ? (
            <StampButton
              title="Manage Subscription"
              onPress={handleOpenCustomerCenter}
              variant="secondary"
              style={styles.manageSubBtn}
            />
          ) : (
            <StampButton
              title="Upgrade to Fields Pro"
              onPress={handleOpenSubscriptionPaywall}
              variant="primary"
              style={styles.upgradeBtn}
            />
          )}
        </View>

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

        {/* Account Key & Device Sync */}
        <View style={styles.card}>
          <View style={styles.membershipHeader}>
            <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1.5}>
              ACCOUNT KEY &amp; DEVICE SYNC
            </TypewriterText>
            <Pressable
              onPress={() => setShowLinkModal(true)}
              hitSlop={8}
            >
              <TypewriterText size="xs" bold color={colors.brickRed}>
                Link Existing Key
              </TypewriterText>
            </Pressable>
          </View>

          <TypewriterText size="xs" color={colors.inkMuted} style={{ marginTop: 4, marginBottom: spacing.sm }}>
            Use your anonymous Account Key to restore purchased credits across devices (Android, iPhone, or Web) or after clearing browser storage.
          </TypewriterText>

          <View style={styles.accountKeyBox}>
            <View style={styles.keyTextWrapper}>
              <TypewriterText size="xs" color={colors.inkMuted}>
                YOUR ACCOUNT KEY:
              </TypewriterText>
              <TypewriterText
                size="sm"
                bold
                color={colors.charcoal}
                style={styles.keyDisplay}
                selectable
              >
                {accountKey || 'Generating key...'}
              </TypewriterText>
            </View>

            <Pressable
              style={[styles.copyKeyBtn, isCopied && styles.copyKeyBtnSuccess]}
              onPress={handleCopyKey}
              hitSlop={6}
            >
              <Ionicons
                name={isCopied ? 'checkmark-outline' : 'copy-outline'}
                size={16}
                color={isCopied ? '#2E6930' : colors.charcoal}
              />
              <TypewriterText
                size="xs"
                bold
                color={isCopied ? '#2E6930' : colors.charcoal}
              >
                {isCopied ? 'COPIED' : 'COPY'}
              </TypewriterText>
            </Pressable>
          </View>
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
            <Pressable style={styles.menuItem} onPress={handleOpenAbout}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="information-circle-outline" size={20} color={colors.charcoal} />
                <TypewriterText size="sm" color={colors.charcoal} style={styles.menuItemText}>
                  About Fields &amp; Art Gallery
                </TypewriterText>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.inkMuted} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.menuItem} onPress={handleOpenPrivacy}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.charcoal} />
                <TypewriterText size="sm" color={colors.charcoal} style={styles.menuItemText}>
                  Privacy & Data Principles
                </TypewriterText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.menuItem} onPress={handleOpenWebPrivacy}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="globe-outline" size={20} color={colors.charcoal} />
                <TypewriterText size="sm" color={colors.charcoal} style={styles.menuItemText}>
                  Official Privacy Policy (Web)
                </TypewriterText>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.inkMuted} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.menuItem} onPress={handleOpenWebTerms}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="document-text-outline" size={20} color={colors.charcoal} />
                <TypewriterText size="sm" color={colors.charcoal} style={styles.menuItemText}>
                  Terms of Service & EULA (Web)
                </TypewriterText>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.inkMuted} />
            </Pressable>
          </View>
        </View>

        {/* Installation Info */}
        <View style={styles.footerInfo}>
          <TypewriterText size="xs" color={colors.inkMuted} style={styles.footerText}>
            Installation ID: {installationId ? installationId.slice(0, 16) + '...' : 'Loading...'}
          </TypewriterText>
          <TypewriterText size="xs" color={colors.inkMuted} style={styles.footerText}>
            FIELDS v1.0.0 · Travel Journal & Scrapbook
          </TypewriterText>
        </View>
      </ScrollView>

      {/* Link Account Modal */}
      <Modal
        visible={showLinkModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isLinking) {
            setShowLinkModal(false);
            setInputKey('');
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => {
              if (!isLinking) {
                setShowLinkModal(false);
                setInputKey('');
              }
            }}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalBadgeRow}>
              <View style={styles.modalBadgePill}>
                <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.2}>
                  ✦ ACCOUNT KEY ✦
                </TypewriterText>
              </View>
            </View>

            <TypewriterText size="md" bold color={colors.charcoal} letterSpacing={1.5} style={styles.modalTitle}>
              LINK ACCOUNT
            </TypewriterText>

            <View style={styles.modalDescBox}>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.modalDesc}>
                Enter your master Account Key (e.g. FIELD-ABCD-1234) from your other device to transfer your credits and unify notebooks.
              </TypewriterText>
            </View>

            <TextInput
              style={styles.keyInput}
              value={inputKey}
              onChangeText={setInputKey}
              placeholder="FIELD-XXXX-YYYY"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <StampButton
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowLinkModal(false);
                  setInputKey('');
                }}
                disabled={isLinking}
                style={styles.modalBtn}
              />
              <StampButton
                title={isLinking ? 'Linking...' : 'Link Key'}
                variant="primary"
                onPress={handleLinkAccount}
                disabled={isLinking || !inputKey.trim()}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  membershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgePro: {
    backgroundColor: '#F7EBE8',
    borderColor: colors.brickRed,
  },
  statusBadgeFree: {
    backgroundColor: colors.paper,
    borderColor: colors.paperBorder,
  },
  upgradeBtn: {
    marginTop: spacing.xs,
    minHeight: 44,
  },
  manageSubBtn: {
    marginTop: spacing.xs,
    minHeight: 40,
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
  accountKeyBox: {
    backgroundColor: '#ECE3D4',
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  keyTextWrapper: {
    flex: 1,
  },
  keyDisplay: {
    fontFamily: fonts.mono,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  copyKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    backgroundColor: colors.paper,
  },
  copyKeyBtnSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 25, 23, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 99999,
  },
  modalCard: {
    width: Math.min(340, Dimensions.get('window').width - spacing.xl * 2),
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.charcoal,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 16,
  },
  modalBadgeRow: {
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  modalBadgePill: {
    backgroundColor: '#E5DFC9',
    borderColor: '#D0C4AF',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalDescBox: {
    backgroundColor: colors.paperDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  modalDesc: {
    textAlign: 'center',
    lineHeight: 18,
  },
  keyInput: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.base,
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: colors.charcoal,
    borderRadius: 8,
    backgroundColor: colors.paperDark,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.charcoal,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    minHeight: 46,
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
