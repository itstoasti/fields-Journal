import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
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
 * - Android: Uses Application.getAndroidId()
 * - iOS: Uses iOS Keychain with keychainService (survives app deletion) or vendor ID
 */
export async function getPersistentDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      const androidId = Application.getAndroidId();
      if (androidId && androidId.length > 0) {
        return `android_${androidId}`;
      }
    } else if (Platform.OS === 'ios') {
      // Check iOS Keychain with device-scoped persistence
      const storedKey = await SecureStore.getItemAsync(PERSISTENT_DEVICE_KEY, {
        keychainService: 'com.fieldnotes.app.device.v1',
      });
      if (storedKey) {
        return storedKey;
      }
      const vendorId = await Application.getIosIdForVendorAsync();
      const deviceId = vendorId ? `ios_${vendorId}` : generateRandomId('ios_dev_');
      await SecureStore.setItemAsync(PERSISTENT_DEVICE_KEY, deviceId, {
        keychainService: 'com.fieldnotes.app.device.v1',
      });
      return deviceId;
    }
  } catch (err) {
    console.warn('[Installation] Could not fetch native device ID, falling back:', err);
  }

  // Fallback / Web
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
