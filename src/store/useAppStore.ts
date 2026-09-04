import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Note, UserEntitlementState, EntitlementType } from '../types';
import { getInstallationAndDeviceInfo } from '../lib/installation';
import { fetchUserEntitlements } from '../lib/api';
import { initializePurchases } from '../lib/purchases';
import { rewardedAdManager } from '../lib/ads';

import { Platform } from 'react-native';

const SAVED_NOTES_KEY = 'fn_saved_notes_json';
const PRIVACY_CONSENT_KEY = 'fn_privacy_consented_v1';
const SELECTED_MODEL_KEY = 'fn_selected_model_v1';
const ENTITLEMENTS_KEY = 'fn_entitlements_v1';

async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.warn('[Store] Failed to write to storage:', e);
  }
}

async function removeStorageItem(key: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.warn('[Store] Failed to remove from storage:', e);
  }
}

export interface AppState {
  isInitialized: boolean;
  installationId: string;
  deviceId: string;
  notes: Note[];
  entitlements: UserEntitlementState;
  hasConsentedPrivacy: boolean;
  selectedModel: string;
  
  // Actions
  initApp: () => Promise<void>;
  setSelectedModel: (model: string) => Promise<void>;
  setPrivacyConsent: (consented: boolean) => Promise<void>;
  addNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  clearAllNotes: () => Promise<void>;
  updateEntitlements: (state: Partial<UserEntitlementState>) => void;
  syncWithBackend: () => Promise<void>;
  getNextNoteNumber: () => string;
  getEntitlementType: () => EntitlementType;
}

export const useAppStore = create<AppState>((set, get) => ({
  isInitialized: false,
  installationId: '',
  deviceId: '',
  notes: [],
  entitlements: {
    freeUsed: 0,
    adUsed: false,
    credits: 0,
    entitlement: 'free',
  },
  hasConsentedPrivacy: false,
  selectedModel: 'grok-imagine-image-2.0',

  initApp: async () => {
    try {
      const { installationId, deviceId } = await getInstallationAndDeviceInfo();
      console.log(`[Store] Initializing app for install=${installationId}, device=${deviceId}`);
      
      // Load privacy consent
      const consentStr = await getStorageItem(PRIVACY_CONSENT_KEY);
      const hasConsentedPrivacy = consentStr === 'true';

      // Load selected model preference
      const savedModel = await getStorageItem(SELECTED_MODEL_KEY);
      const selectedModel = savedModel || 'grok-imagine-image-2.0';

      // Load saved notes
      let loadedNotes: Note[] = [];
      const notesJson = await getStorageItem(SAVED_NOTES_KEY);
      if (notesJson) {
        try {
          loadedNotes = JSON.parse(notesJson);
        } catch (e) {
          console.warn('[Store] Failed to parse saved notes JSON:', e);
        }
      }

      // Load cached local entitlements immediately
      let initialEntitlements: UserEntitlementState = {
        freeUsed: 0,
        adUsed: false,
        credits: 0,
        entitlement: 'free',
      };
      const savedEntitlements = await getStorageItem(ENTITLEMENTS_KEY);
      if (savedEntitlements) {
        try {
          initialEntitlements = JSON.parse(savedEntitlements);
          console.log('[Store] Loaded cached entitlements from storage:', initialEntitlements);
        } catch {}
      }

      // Populate local state immediately with cached entitlements
      set({
        installationId,
        deviceId,
        notes: loadedNotes,
        hasConsentedPrivacy,
        selectedModel,
        entitlements: initialEntitlements,
      });

      // Initialize purchases with customer info listener
      await initializePurchases(installationId, (_customerInfo, isPro) => {
        console.log('[Store] RevenueCat listener update -> isPro:', isPro);
        const current = get().entitlements;
        const updated: UserEntitlementState = {
          ...current,
          isPro,
          entitlement: isPro ? 'pro' : (current.entitlement === 'pro' ? 'paywall' : current.entitlement),
        };
        set({ entitlements: updated });
        setStorageItem(ENTITLEMENTS_KEY, JSON.stringify(updated));
      });

      // Fetch authoritative server entitlements with persistent deviceId
      try {
        const serverEntitlements = await fetchUserEntitlements(installationId, deviceId);
        console.log('[Store] Received live server entitlements:', serverEntitlements);
        
        // Preserve active RevenueCat Pro state if already verified
        const currentIsPro = Boolean(get().entitlements.isPro);
        if (currentIsPro) {
          serverEntitlements.isPro = true;
          serverEntitlements.entitlement = 'pro';
        }

        set({
          isInitialized: true,
          entitlements: serverEntitlements,
        });
        await setStorageItem(ENTITLEMENTS_KEY, JSON.stringify(serverEntitlements));

        if (serverEntitlements.entitlement === 'ad' || serverEntitlements.freeUsed >= 2) {
          rewardedAdManager.preloadAd();
        }
      } catch (networkErr) {
        console.warn('[Store] Could not fetch server entitlements on launch, keeping cached state:', networkErr);
        set({ isInitialized: true });
      }
    } catch (error) {
      console.warn('[Store] Error during app initialization:', error);
      set({ isInitialized: true });
    }
  },

  setSelectedModel: async (model: string) => {
    set({ selectedModel: model });
    await setStorageItem(SELECTED_MODEL_KEY, model);
  },

  setPrivacyConsent: async (consented: boolean) => {
    await setStorageItem(PRIVACY_CONSENT_KEY, consented ? 'true' : 'false');
    set({ hasConsentedPrivacy: consented });
  },

  addNote: async (newNote: Note) => {
    const currentNotes = get().notes;
    const updated = [newNote, ...currentNotes];
    set({ notes: updated });
    await setStorageItem(SAVED_NOTES_KEY, JSON.stringify(updated));
  },

  deleteNote: async (id: string) => {
    const updated = get().notes.filter((n) => n.id !== id);
    set({ notes: updated });
    await setStorageItem(SAVED_NOTES_KEY, JSON.stringify(updated));
  },

  clearAllNotes: async () => {
    set({ notes: [] });
    await removeStorageItem(SAVED_NOTES_KEY);
  },

  updateEntitlements: (partial: Partial<UserEntitlementState>) => {
    const current = get().entitlements;
    const merged = { ...current, ...partial };
    
    // Recompute entitlement status
    let type: EntitlementType = 'paywall';
    if (merged.isPro) {
      type = 'pro';
    } else if (merged.freeUsed < 2) {
      type = 'free';
    } else if (merged.freeUsed >= 2 && !merged.adUsed) {
      type = 'ad';
    } else if (merged.credits > 0) {
      type = 'credit';
    }

    merged.entitlement = type;
    console.log('[Store] updateEntitlements -> new state:', merged);
    set({ entitlements: merged });

    // Persist immediately
    setStorageItem(ENTITLEMENTS_KEY, JSON.stringify(merged));

    if (type === 'ad') {
      rewardedAdManager.preloadAd();
    }
  },

  syncWithBackend: async () => {
    const id = get().installationId;
    const devId = get().deviceId;
    if (!id) return;
    try {
      console.log(`[Store] syncWithBackend for install=${id}, dev=${devId}`);
      const serverEntitlements = await fetchUserEntitlements(id, devId);
      console.log('[Store] syncWithBackend response:', serverEntitlements);

      // Preserve active RevenueCat Pro state if already verified
      const currentIsPro = Boolean(get().entitlements.isPro);
      if (currentIsPro) {
        serverEntitlements.isPro = true;
        serverEntitlements.entitlement = 'pro';
      }

      set({ entitlements: serverEntitlements });
      await setStorageItem(ENTITLEMENTS_KEY, JSON.stringify(serverEntitlements));
      if (serverEntitlements.entitlement === 'ad') {
        rewardedAdManager.preloadAd();
      }
    } catch (e) {
      console.warn('[Store] syncWithBackend failed, preserving current state:', e);
    }
  },

  getNextNoteNumber: () => {
    const currentNotes = get().notes;
    const nextNum = currentNotes.length + 1;
    return nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
  },

  getEntitlementType: () => {
    const entitlements = get().entitlements;
    if (entitlements.isPro) return 'pro';
    return entitlements.entitlement;
  },
}));
