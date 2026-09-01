import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { GenerateNoteRequest, GenerateNoteResponse, UserEntitlementState, ApiError } from '../types';

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Check Expo Constants for dev server host IP (e.g. "192.168.1.168:8081")
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:3001`;
    }
  }

  // Fallback to local machine IP on LAN
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return 'http://192.168.1.168:3001';
  }

  return 'http://127.0.0.1:3001';
}

const API_BASE_URL = getApiBaseUrl();

export async function fetchUserEntitlements(installationId: string): Promise<UserEntitlementState> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/me?installationId=${encodeURIComponent(installationId)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${installationId}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entitlements: ${response.status}`);
    }

    const data = await response.json();
    return {
      freeUsed: data.freeUsed ?? 0,
      adUsed: Boolean(data.adUsed),
      credits: data.credits ?? 0,
      entitlement: data.entitlement ?? 'free',
    };
  } catch (error) {
    console.warn('[API] Could not reach backend for me, using local fallback state:', error);
    return {
      freeUsed: 0,
      adUsed: false,
      credits: 0,
      entitlement: 'free',
    };
  }
}

export async function submitGenerateNote(request: GenerateNoteRequest): Promise<GenerateNoteResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 75000); // 75s client timeout

  try {
    const response = await fetch(`${API_BASE_URL}/v1/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${request.installationId}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorJson: ApiError = await response.json().catch(() => ({
        error: 'NETWORK_ERROR',
        message: `HTTP Error ${response.status}`,
      }));
      throw new Error(errorJson.message || errorJson.error || 'Field note generation failed.');
    }

    const data: GenerateNoteResponse = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out. The server took too long to generate your note. Your credits were not deducted.');
    }
    throw error;
  }
}

export async function syncPurchasedCredits(
  installationId: string,
  creditsToAdd: number = 20,
  rcUserId?: string
): Promise<UserEntitlementState> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/credits/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${installationId}`,
      },
      body: JSON.stringify({
        installationId,
        rcUserId,
        packageId: 'notes_20',
        creditsToAdd,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed with status: ${response.status}`);
    }

    const data = await response.json();
    return {
      freeUsed: data.freeUsed,
      adUsed: data.adUsed,
      credits: data.credits,
      entitlement: data.entitlement,
    };
  } catch (error) {
    console.warn('[API] syncPurchasedCredits failed:', error);
    throw error;
  }
}
