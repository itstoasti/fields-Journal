import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

let Purchases: any = null;
if (!isExpoGo) {
  try {
    const rcModule = require('react-native-purchases');
    Purchases = rcModule.default || rcModule;
  } catch (err) {
    console.warn('[Purchases Native] RevenueCat module unavailable in this build:', err);
  }
}

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 'goog_sample_key';
export const PRODUCT_NOTES_20 = process.env.EXPO_PUBLIC_RC_PRODUCT_NOTES_20 || 'notes_20';

let isPurchasesConfigured = false;

export async function initializePurchases(appUserId: string): Promise<void> {
  if (isPurchasesConfigured) return;
  if (isExpoGo || !Purchases) {
    console.log('[Purchases] Expo Go detected: RevenueCat simulation enabled');
    isPurchasesConfigured = true;
    return;
  }

  try {
    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: appUserId,
    });
    isPurchasesConfigured = true;
    console.log('[Purchases] RevenueCat configured for user:', appUserId);
  } catch (error) {
    console.warn('[Purchases] RevenueCat initialization failed:', error);
  }
}

export async function buyNotes20Package(): Promise<{ success: boolean; error?: string }> {
  if (isExpoGo || !Purchases) {
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
      if (__DEV__) {
        console.log('[Purchases Dev] Simulating purchase of 20 notes in development mode');
        return { success: true };
      }
      return { success: false, error: 'Product not found in current offerings.' };
    }

    const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
    console.log('[Purchases] Purchase completed successfully:', customerInfo);
    return { success: true };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    console.warn('[Purchases] Purchase error:', error);
    if (__DEV__) {
      return { success: true };
    }
    return { success: false, error: error.message || 'Payment could not be completed.' };
  }
}

export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  if (isExpoGo || !Purchases) {
    console.log('[Purchases] Expo Go simulated restore purchases');
    return { success: true };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('[Purchases] Restored customer info:', customerInfo);
    return { success: true };
  } catch (error: any) {
    console.warn('[Purchases] Restore error:', error);
    return { success: false, error: error.message || 'Could not restore purchases.' };
  }
}

