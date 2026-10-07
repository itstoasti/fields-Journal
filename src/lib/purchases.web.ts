import { FieldAlert } from '../components/FieldAlert';

export const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 'test_kejmcZYQWmrefaSizVLCGOzPWDB';

export const ENTITLEMENT_PRO =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID || 'fields_travel_journal_scrapebook_pro';

export const PRODUCT_LIFETIME = process.env.EXPO_PUBLIC_RC_PRODUCT_LIFETIME || 'lifetime';
export const PRODUCT_YEARLY = process.env.EXPO_PUBLIC_RC_PRODUCT_YEARLY || 'yearly';
export const PRODUCT_MONTHLY = process.env.EXPO_PUBLIC_RC_PRODUCT_MONTHLY || 'monthly';
export const PRODUCT_NOTES_20 = process.env.EXPO_PUBLIC_RC_PRODUCT_NOTES_20 || 'notes_20';

export function isExpoGoClient(): boolean {
  return true;
}

export function isRevenueCatNativeSupported(): boolean {
  return false;
}

let onCustomerInfoCallback: ((info: any, isPro: boolean) => void) | null = null;
let mockIsPro = false;

export function checkProEntitlement(customerInfo: any): boolean {
  if (!customerInfo || !customerInfo.entitlements || !customerInfo.entitlements.active) {
    return false;
  }
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_PRO]);
}

export function setOnCustomerInfoUpdate(callback: (info: any, isPro: boolean) => void): void {
  onCustomerInfoCallback = callback;
}

export async function initializePurchases(
  appUserId: string,
  onUpdate?: (info: any, isPro: boolean) => void
): Promise<void> {
  if (onUpdate) {
    onCustomerInfoCallback = onUpdate;
  }
  console.log('[Purchases Web] Initialized purchases mock for:', appUserId);
}

export async function getCustomerInfo(): Promise<any | null> {
  return {
    entitlements: {
      active: mockIsPro ? { [ENTITLEMENT_PRO]: { identifier: ENTITLEMENT_PRO, isActive: true } } : {},
    },
  };
}

export async function getOfferings(): Promise<any | null> {
  return {
    identifier: 'default',
    availablePackages: [
      { identifier: PRODUCT_MONTHLY, packageType: 'MONTHLY' },
      { identifier: PRODUCT_YEARLY, packageType: 'ANNUAL' },
      { identifier: PRODUCT_LIFETIME, packageType: 'LIFETIME' },
      { identifier: PRODUCT_NOTES_20, packageType: 'CUSTOM' },
    ],
  };
}

export async function purchasePackage(packageToBuy: any): Promise<{
  success: boolean;
  isPro: boolean;
  customerInfo?: any;
  error?: string;
}> {
  console.log('[Purchases Web] Simulating purchase of package:', packageToBuy);
  mockIsPro = true;
  const info = await getCustomerInfo();
  if (onCustomerInfoCallback) {
    onCustomerInfoCallback(info, true);
  }
  return { success: true, isPro: true, customerInfo: info };
}

export async function restorePurchases(): Promise<{
  success: boolean;
  isPro: boolean;
  customerInfo?: any;
  error?: string;
}> {
  console.log('[Purchases Web] Simulating restore purchases');
  const info = await getCustomerInfo();
  if (onCustomerInfoCallback) {
    onCustomerInfoCallback(info, mockIsPro);
  }
  return { success: true, isPro: mockIsPro, customerInfo: info };
}

export async function presentRevenueCatPaywall(): Promise<{
  result: string;
  isPro: boolean;
}> {
  console.log('[Purchases Web] Simulating presentRevenueCatPaywall');
  FieldAlert.alert('RevenueCat Paywall', 'Simulating RevenueCat Pro subscription on Web / Mock.');
  mockIsPro = true;
  const info = await getCustomerInfo();
  if (onCustomerInfoCallback) {
    onCustomerInfoCallback(info, true);
  }
  return { result: 'PURCHASED', isPro: true };
}

export async function presentRevenueCatPaywallIfNeeded(): Promise<{
  result: string;
  isPro: boolean;
}> {
  if (mockIsPro) {
    return { result: 'NOT_PRESENTED', isPro: true };
  }
  return presentRevenueCatPaywall();
}

export async function presentCustomerCenter(): Promise<void> {
  FieldAlert.alert(
    'Customer Center',
    'Simulating RevenueCat Customer Center. Manage subscriptions, billing, and cancellations.'
  );
}

export async function buyLifetimePackage(): Promise<{
  success: boolean;
  isPro: boolean;
  error?: string;
}> {
  return {
    success: false,
    isPro: false,
    error: 'Fields Pro subscription is available in the FIELDS mobile app for iOS and Android.',
  };
}

export async function buyNotes20Package(): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  return {
    success: false,
    error: 'Note credit packs are available in the FIELDS mobile app for iOS and Android.',
  };
}
