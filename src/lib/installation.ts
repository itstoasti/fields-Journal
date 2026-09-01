import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const INSTALLATION_KEY = 'fn_installation_id';

function generateRandomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'inst_';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function getOrCreateInstallationId(): Promise<string> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    let existing = localStorage.getItem(INSTALLATION_KEY);
    if (!existing) {
      existing = generateRandomId();
      localStorage.setItem(INSTALLATION_KEY, existing);
    }
    return existing;
  }

  try {
    const existing = await SecureStore.getItemAsync(INSTALLATION_KEY);
    if (existing) {
      return existing;
    }
    const newId = generateRandomId();
    await SecureStore.setItemAsync(INSTALLATION_KEY, newId);
    return newId;
  } catch (error) {
    console.warn('[Installation] SecureStore error, falling back to random ID:', error);
    return generateRandomId();
  }
}
