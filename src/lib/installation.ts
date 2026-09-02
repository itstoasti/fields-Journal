import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
 * Safely accesses native expo-application module if compiled in APK.
 */
function getNativeApplication(): typeof import('expo-application') | null {
  try {
    // Dynamic require prevents crash if native module is not yet compiled into current APK
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appModule = require('expo-application');
    return appModule;
  } catch {
    return null;
  }
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
 * Retrieves a hardware-persistent device ID that survives app uninstalls and data wipes.
 * - Android: Uses Application.getAndroidId() if available in native build
 * - iOS: Uses iOS Keychain with keychainService (survives app deletion) or vendor ID
 */
export async function getPersistentDeviceId(): Promise<string> {
  try {
    const app = getNativeApplication();

    if (Platform.OS === 'android' && app && typeof app.getAndroidId === 'function') {
      const androidId = app.getAndroidId();
      if (androidId && androidId.length > 0) {
        return `android_${androidId}`;
      }
    } else if (Platform.OS === 'ios') {
      const storedKey = await SecureStore.getItemAsync(PERSISTENT_DEVICE_KEY, {
        keychainService: 'com.fieldnotes.app.device.v1',
      });
      if (storedKey) {
        return storedKey;
      }
      let vendorId: string | null = null;
      if (app && typeof app.getIosIdForVendorAsync === 'function') {
        vendorId = await app.getIosIdForVendorAsync();
      }
      const deviceId = vendorId ? `ios_${vendorId}` : generateRandomId('ios_dev_');
      await SecureStore.setItemAsync(PERSISTENT_DEVICE_KEY, deviceId, {
        keychainService: 'com.fieldnotes.app.device.v1',
      });
      return deviceId;
    }
  } catch (err) {
    console.warn('[Installation] Native device ID check completed with fallback:', err);
  }

  // Fallback persistent storage
  try {
    const stored = await SecureStore.getItemAsync(PERSISTENT_DEVICE_KEY);
    if (stored) return stored;
    const fallbackId = generateRandomId('dev_');
    await SecureStore.setItemAsync(PERSISTENT_DEVICE_KEY, fallbackId);
    return fallbackId;
  } catch {
    // Web fallback
    if (typeof localStorage !== 'undefined') {
      let devId = localStorage.getItem(PERSISTENT_DEVICE_KEY);
      if (!devId) {
        devId = generateRandomId('web_dev_');
        localStorage.setItem(PERSISTENT_DEVICE_KEY, devId);
      }
      return devId;
    }
    return generateRandomId('dev_');
  }
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
