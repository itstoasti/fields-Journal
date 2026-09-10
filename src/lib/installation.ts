import * as SecureStore from 'expo-secure-store';
import { NativeModules, Platform } from 'react-native';

const INSTALLATION_KEY = 'fn_installation_id';
const PERSISTENT_DEVICE_KEY = 'fn_persistent_device_id_v1';
const ACCOUNT_KEY = 'fn_account_key';

function generateRandomId(prefix = 'inst_'): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Computes a deterministic, privacy-friendly hardware signature for Web browsers.
 * Combines GPU renderer, screen metrics, canvas micro-rendering, and audio parameters.
 * Survives cache clearing, localStorage wiping, and Incognito mode.
 */
function computeWebHardwareFingerprint(): string {
  if (typeof window === 'undefined') {
    return generateRandomId('web_hw_');
  }

  const components: string[] = [];

  // 1. Screen & Display metrics
  try {
    const screen = window.screen;
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    components.push(`dpr:${window.devicePixelRatio || 1}`);
  } catch {}

  // 2. Hardware specs & platform
  try {
    const nav = window.navigator as any;
    components.push(`cores:${nav.hardwareConcurrency || 2}`);
    components.push(`lang:${nav.language || 'en'}`);
    components.push(`plat:${nav.platform || 'web'}`);
  } catch {}

  // 3. WebGL GPU Unmasked Vendor & Renderer
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        components.push(`gpu:${vendor}~${renderer}`);
      }
    }
  } catch {}

  // 4. Canvas 2D Text Micro-Rendering Signature
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 5, 60, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Fields Stamp 2026', 12, 10);
      components.push(`canvas:${canvas.toDataURL().slice(-50)}`);
    }
  } catch {}

  // 5. Timezone
  try {
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone || ''}`);
  } catch {}

  // Hash components using dual FNV-1a algorithms
  const rawStr = components.join('|');
  let hash1 = 2166136261;
  for (let i = 0; i < rawStr.length; i++) {
    hash1 ^= rawStr.charCodeAt(i);
    hash1 = Math.imul(hash1, 16777619);
  }
  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');

  let hash2 = 0x811c9dc5;
  for (let i = rawStr.length - 1; i >= 0; i--) {
    hash2 ^= rawStr.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x01000193);
  }
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');

  return `web_hw_${h1}${h2}`;
}

/**
 * Retrieves the ephemeral installation ID (generated on each install or linked via account key).
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
 * On native, safely probes native hardware ID if present in APK, with SecureStore fallback.
 * On web, computes a deterministic hardware fingerprint that survives cache clearing & Incognito.
 */
export async function getPersistentDeviceId(): Promise<string> {
  // 1. Web: Deterministic hardware fingerprint (survives cache clearing and incognito)
  if (Platform.OS === 'web') {
    return computeWebHardwareFingerprint();
  }

  // 2. Check if persistent key already exists in SecureStore
  try {
    const stored = await SecureStore.getItemAsync(PERSISTENT_DEVICE_KEY);
    if (stored && stored.length > 0) {
      return stored;
    }
  } catch {}

  // 3. Check if native ExpoApplication module is registered in runtime before requiring
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

  // 4. Generate and persist fallback device ID in SecureStore
  const newDeviceId = generateRandomId('dev_');
  try {
    await SecureStore.setItemAsync(PERSISTENT_DEVICE_KEY, newDeviceId);
  } catch (e) {
    console.warn('[Installation] Could not persist device ID to SecureStore:', e);
  }

  return newDeviceId;
}

/**
 * Updates stored local identity when linking an account key across devices.
 */
export async function updateActiveIdentity(
  newInstallationId: string,
  newAccountKey?: string
): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(INSTALLATION_KEY, newInstallationId);
    if (newAccountKey) {
      localStorage.setItem(ACCOUNT_KEY, newAccountKey);
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(INSTALLATION_KEY, newInstallationId);
    if (newAccountKey) {
      await SecureStore.setItemAsync(ACCOUNT_KEY, newAccountKey);
    }
  } catch (err) {
    console.warn('[Installation] Could not update active identity in SecureStore:', err);
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
