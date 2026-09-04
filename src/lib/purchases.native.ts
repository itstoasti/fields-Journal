import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Alert, Platform, NativeModules } from 'react-native';

/**
 * Robust runtime detection of Expo Go / environments without native compiled modules.
 * In Expo Go, native binaries (RNPurchases, RNPaywalls, etc.) are NOT linked into the APK/IPA.
 */
export function isExpoGoClient(): boolean {
  if (Platform.OS === 'web') return true;

  try {
    const execEnv = String(
      (Constants as any)?.executionEnvironment ||
      (Constants as any)?.default?.executionEnvironment ||
      ''
    );

    if (
      execEnv === 'storeClient' ||
      (Constants as any)?.appOwnership === 'expo' ||
      (Constants as any)?.default?.appOwnership === 'expo'
    ) {
      return true;
    }

    if (Boolean((globalThis as any)?.expo?.modules?.ExpoGo)) {
      return true;
    }

    // If RNPurchases native module is absent, we are in Expo Go or an unlinked mock environment
    if (!NativeModules?.RNPurchases) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

// Safe dynamic imports for React Native Purchases & PurchasesUI
let Purchases: any = null;
let RevenueCatUI: any = null;
let LOG_LEVEL: any = null;

if (!isExpoGoClient() && Platform.OS !== 'web') {
  try {
    const rcModule = require('react-native-purchases');
    Purchases = rcModule.default || rcModule;
    LOG_LEVEL = rcModule.LOG_LEVEL;
  } catch (err) {
    console.warn('[Purchases Native] Purchases module load error:', err);
  }

  try {
    const rcUiModule = require('react-native-purchases-ui');
    RevenueCatUI = rcUiModule.default || rcUiModule;
  } catch (err) {
    console.warn('[Purchases Native] PurchasesUI module load error:', err);
  }
}

export const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 'test_kejmcZYQWmrefaSizVLCGOzPWDB';

export const ENTITLEMENT_PRO =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID || 'fields_travel_journal_scrapebook_pro';

export const PRODUCT_LIFETIME = process.env.EXPO_PUBLIC_RC_PRODUCT_LIFETIME || 'lifetime';
export const PRODUCT_YEARLY = process.env.EXPO_PUBLIC_RC_PRODUCT_YEARLY || 'yearly';
export const PRODUCT_MONTHLY = process.env.EXPO_PUBLIC_RC_PRODUCT_MONTHLY || 'monthly';
export const PRODUCT_NOTES_20 = process.env.EXPO_PUBLIC_RC_PRODUCT_NOTES_20 || 'notes_20';

let isPurchasesConfigured = false;
let customerInfoListenerSubscribed = false;
let onCustomerInfoCallback: ((info: any, isPro: boolean) => void) | null = null;

/**
 * Checks if customerInfo contains the active Pro entitlement
 */
export function checkProEntitlement(customerInfo: any): boolean {
  if (!customerInfo || !customerInfo.entitlements || !customerInfo.entitlements.active) {
    return false;
  }
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_PRO]);
}

/**
 * Sets customer info callback listener for external state sync (e.g. Zustand store)
 */
export function setOnCustomerInfoUpdate(callback: (info: any, isPro: boolean) => void): void {
  onCustomerInfoCallback = callback;
}

/**
 * Initialize and configure the RevenueCat SDK
 */
export async function initializePurchases(
  appUserId: string,
  onUpdate?: (info: any, isPro: boolean) => void
): Promise<void> {
  if (onUpdate) {
    onCustomerInfoCallback = onUpdate;
  }

  if (isPurchasesConfigured) return;

  if (isExpoGoClient() || !Purchases) {
    console.log('[Purchases] Expo Go / non-native client detected: RevenueCat simulation enabled');
    isPurchasesConfigured = true;
    return;
  }

  try {
    if (__DEV__ && LOG_LEVEL?.DEBUG) {
      try {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      } catch {}
    }

    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: appUserId,
    });

    isPurchasesConfigured = true;
    console.log(`[Purchases] RevenueCat configured for user=${appUserId}`);

    // Register active customer info update listener
    if (!customerInfoListenerSubscribed) {
      try {
        Purchases.addCustomerInfoUpdateListener((customerInfo: any) => {
          try {
            const isPro = checkProEntitlement(customerInfo);
            console.log('[Purchases] CustomerInfo updated. Active Pro entitlement:', isPro);
            if (onCustomerInfoCallback) {
              onCustomerInfoCallback(customerInfo, isPro);
            }
          } catch (listenerErr) {
            console.warn('[Purchases] Listener callback warning:', listenerErr);
          }
        });
        customerInfoListenerSubscribed = true;
      } catch (subErr) {
        console.warn('[Purchases] Could not attach listener:', subErr);
      }
    }

    // Safe initial check of customer info on boot
    try {
      const isConfigured = await Purchases.isConfigured?.();
      if (isConfigured !== false) {
        const info = await Purchases.getCustomerInfo();
        const isPro = checkProEntitlement(info);
        if (onCustomerInfoCallback && info) {
          onCustomerInfoCallback(info, isPro);
        }
      }
    } catch (infoErr) {
      console.warn('[Purchases] Initial customer info check warning:', infoErr);
    }
  } catch (error) {
    console.warn('[Purchases] RevenueCat initialization failed, continuing in simulation mode:', error);
    isPurchasesConfigured = true;
  }
}

/**
 * Retrieves the current customer info from RevenueCat
 */
export async function getCustomerInfo(): Promise<any | null> {
  if (isExpoGoClient() || !Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.warn('[Purchases] Error fetching customer info:', err);
    return null;
  }
}

/**
 * Fetches all available offerings and subscription packages from RevenueCat
 */
export async function getOfferings(): Promise<any | null> {
  if (isExpoGoClient() || !Purchases) {
    console.log('[Purchases] Simulated offerings returned');
    return null;
  }
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current || null;
  } catch (err) {
    console.warn('[Purchases] Error fetching offerings:', err);
    return null;
  }
}

/**
 * Purchases a specific package (Monthly, Yearly, Lifetime)
 */
export async function purchasePackage(packageToBuy: any): Promise<{
  success: boolean;
  isPro: boolean;
  customerInfo?: any;
  error?: string;
}> {
  if (isExpoGoClient() || !Purchases) {
    console.log('[Purchases] Simulated package purchase in Expo Go');
    if (onCustomerInfoCallback) {
      onCustomerInfoCallback(
        { entitlements: { active: { [ENTITLEMENT_PRO]: { isActive: true } } } },
        true
      );
    }
    return { success: true, isPro: true };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
    const isPro = checkProEntitlement(customerInfo);
    if (onCustomerInfoCallback) {
      onCustomerInfoCallback(customerInfo, isPro);
    }
    return { success: true, isPro, customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, isPro: false, error: 'cancelled' };
    }
    console.warn('[Purchases] Purchase error:', error);
    return {
      success: false,
      isPro: false,
      error: error.message || 'The purchase could not be completed.',
    };
  }
}

/**
 * Restores previous purchases for the active store account
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPro: boolean;
  customerInfo?: any;
  error?: string;
}> {
  if (isExpoGoClient() || !Purchases) {
    console.log('[Purchases] Simulated restore purchases in Expo Go');
    return { success: true, isPro: false };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = checkProEntitlement(customerInfo);
    console.log('[Purchases] Restored customer info. Active Pro:', isPro);

    if (onCustomerInfoCallback) {
      onCustomerInfoCallback(customerInfo, isPro);
    }

    return { success: true, isPro, customerInfo };
  } catch (error: any) {
    console.warn('[Purchases] Restore error:', error);
    return {
      success: false,
      isPro: false,
      error: error.message || 'Could not restore purchases.',
    };
  }
}

/**
 * Presents the native RevenueCat UI Paywall.
 * Automatically displays configured packages (Monthly, Yearly, Lifetime) with native animations.
 */
export async function presentRevenueCatPaywall(): Promise<{
  result: string;
  isPro: boolean;
}> {
  if (isExpoGoClient() || !RevenueCatUI || typeof RevenueCatUI.presentPaywall !== 'function') {
    console.log('[Purchases] Presenting development simulated paywall in Expo Go');
    return new Promise((resolve) => {
      Alert.alert(
        'Fields Pro (Expo Go Mode)',
        'In a production store build, this displays the native animated RevenueCat Paywall.\n\nWould you like to simulate activating Fields Pro for testing?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ result: 'CANCELLED', isPro: false }),
          },
          {
            text: 'Simulate Pro',
            onPress: () => {
              if (onCustomerInfoCallback) {
                onCustomerInfoCallback(
                  { entitlements: { active: { [ENTITLEMENT_PRO]: { isActive: true } } } },
                  true
                );
              }
              resolve({ result: 'PURCHASED', isPro: true });
            },
          },
        ]
      );
    });
  }

  try {
    const paywallResult = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
    });

    const info = await getCustomerInfo();
    const isPro = checkProEntitlement(info);

    if (onCustomerInfoCallback && info) {
      onCustomerInfoCallback(info, isPro);
    }

    return {
      result: String(paywallResult),
      isPro,
    };
  } catch (err: any) {
    console.warn('[Purchases] Error presenting RevenueCat paywall:', err);
    return { result: 'ERROR', isPro: false };
  }
}

/**
 * Presents the RevenueCat Paywall ONLY IF the user is not already subscribed to Pro.
 */
export async function presentRevenueCatPaywallIfNeeded(): Promise<{
  result: string;
  isPro: boolean;
}> {
  if (isExpoGoClient() || !RevenueCatUI || typeof RevenueCatUI.presentPaywallIfNeeded !== 'function') {
    return presentRevenueCatPaywall();
  }

  try {
    const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_PRO,
      displayCloseButton: true,
    });

    const info = await getCustomerInfo();
    const isPro = checkProEntitlement(info);

    if (onCustomerInfoCallback && info) {
      onCustomerInfoCallback(info, isPro);
    }

    return {
      result: String(paywallResult),
      isPro,
    };
  } catch (err: any) {
    console.warn('[Purchases] Error presenting PaywallIfNeeded:', err);
    return { result: 'ERROR', isPro: false };
  }
}

/**
 * Presents the RevenueCat Customer Center.
 * Allows users to manage active subscriptions, view billing history, change tiers, or restore purchases.
 */
export async function presentCustomerCenter(): Promise<void> {
  if (isExpoGoClient() || !RevenueCatUI || typeof RevenueCatUI.presentCustomerCenter !== 'function') {
    Alert.alert(
      'Manage Subscription',
      'In a production build, this opens the RevenueCat Customer Center.\n\nSubscribers can also manage or cancel their subscription directly in their Google Play Store or Apple App Store account settings.'
    );
    return;
  }

  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (err) {
    console.warn('[Purchases] Error presenting Customer Center:', err);
    Alert.alert(
      'Manage Subscription',
      'You can manage or cancel your active subscription in your Google Play Store or Apple App Store account settings.'
    );
  }
}

/**
 * Backward compatibility: Buy 20 Note Credits consumable package
 */
export async function buyNotes20Package(): Promise<{ success: boolean; error?: string }> {
  if (isExpoGoClient() || !Purchases) {
    console.log('[Purchases] Expo Go simulated 20 note credits purchase');
    return { success: true };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;

    let packageToBuy = currentOffering?.availablePackages.find(
      (pkg: any) => pkg.identifier === PRODUCT_NOTES_20 || pkg.product.identifier === PRODUCT_NOTES_20
    );

    if (!packageToBuy && currentOffering?.availablePackages.length) {
      packageToBuy = currentOffering.availablePackages[0];
    }

    if (!packageToBuy) {
      return { success: false, error: 'Product not found in current offerings.' };
    }

    const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
    const isPro = checkProEntitlement(customerInfo);
    if (onCustomerInfoCallback) {
      onCustomerInfoCallback(customerInfo, isPro);
    }
    return { success: true };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: error.message || 'Payment could not be completed.' };
  }
}
