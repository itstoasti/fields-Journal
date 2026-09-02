import * as SecureStore from 'expo-secure-store';
import { NativeModules, Platform } from 'react-native';

const INSTALLATION_KEY = 'fn_installation_id';
const PERSISTENT_DEVICE_KEY = 'fn_persistent_device_id_v1';

function generateRandomId(prefix = 'inst_'): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Retrieves the ephemeral installation ID (generated on each install).
 */
export async function getOrCreateInstallationId(): Promise<string> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    let existing = localStorage.getItem(INSTALLATION_KEY);
    if (!existing) {
      existing = generateRandomId('inst_');
      localStorage.setItem(INSTALLATION_KEY, existing);
    }
    return existing;
  }

  try {
    const existing = await SecureStore.getItemAsync(INSTALLATION_KEY);
    if (existing) {
      return existing;
    }
    const newId = generateRandomId('inst_');
    await SecureStore.setItemAsync(INSTALLATION_KEY, newId);
    return newId;
  } catch (error) {
    console.warn('[Installation] SecureStore error, falling back to random ID:', error);
    return generateRandomId('inst_');
  }
}

/**
 * Retrieves a persistent device ID.
 * Safely probes native hardware ID if native module is present in APK,
 * with reliable SecureStore fallback.
 */
export async function getPersistentDeviceId(): Promise<string> {
  // 1. Check if persistent key already exists in SecureStore
  try {
    const stored = await SecureStore.getItemAsync(PERSISTENT_DEVICE_KEY);
    if (stored && stored.length > 0) {
      return stored;
    }
  } catch {}

  // 2. Check if native ExpoApplication module is registered in runtime before requiring
  try {
    const hasExpoAppModule = Boolean(
      (globalThis as any)?.expo?.modules?.ExpoApplication ||
      NativeModules?.ExpoApplication
    );

    if (hasExpoAppModule) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const app = require('expo-application');
      if (Platform.OS === 'android' && typeof app?.getAndroidId === 'function') {
        const aId = app.getAndroidId();
        if (aId) {
          const devId = `android_${aId}`;
          try {
            await SecureStore.setItemAsync(PERSISTENT_DEVICE_KEY, devId);
          } catch {}
          return devId;
        }
      }
    }
  } catch (e) {
    console.warn('[Installation] Native application ID probe skipped:', e);
  }

  // 3. Web fallback
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    let devId = localStorage.getItem(PERSISTENT_DEVICE_KEY);
    if (!devId) {
      devId = generateRandomId('web_dev_');
      localStorage.setItem(PERSISTENT_DEVICE_KEY, devId);
    }
    return devId;
  }

  // 4. Generate and persist fallback device ID in SecureStore
  const newDeviceId = generateRandomId('dev_');
  try {
    await SecureStore.setItemAsync(PERSISTENT_DEVICE_KEY, newDeviceId);
  } catch (e) {
    console.warn('[Installation] Could not persist device ID to SecureStore:', e);
  }

  return newDeviceId;
}

export async function getInstallationAndDeviceInfo(): Promise<{
  installationId: string;
  deviceId: string;
}> {
  const [installationId, deviceId] = await Promise.all([
    getOrCreateInstallationId(),
    getPersistentDeviceId(),
  ]);
  return { installationId, deviceId };
}
