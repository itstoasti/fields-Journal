export const PRODUCT_NOTES_20 = 'notes_20';

export async function initializePurchases(appUserId: string): Promise<void> {
  console.log('[Purchases Web] Initialized purchases mock for:', appUserId);
}

export async function buyNotes20Package(): Promise<{ success: boolean; error?: string }> {
  console.log('[Purchases Web] Simulating purchase of 20 notes');
  return { success: true };
}

export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  console.log('[Purchases Web] Simulating restore purchases');
  return { success: true };
}
