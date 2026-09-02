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
    if (host && host.length > 0) {
      return `http://${host}:3001`;
    }
  }

  // Fallback to local machine IP on LAN
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return 'http://192.168.1.168:3001';
  }

  return 'http://127.0.0.1:3001';
}

export async function fetchUserEntitlements(
  installationId: string,
  deviceId?: string
): Promise<UserEntitlementState> {
  const baseUrl = getApiBaseUrl();
  const query = new URLSearchParams({ installationId });
  if (deviceId) {
    query.append('deviceId', deviceId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s network timeout

  try {
    const response = await fetch(`${baseUrl}/v1/me?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${installationId}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function submitGenerateNote(request: GenerateNoteRequest): Promise<GenerateNoteResponse> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 75000); // 75s client timeout

  try {
    const response = await fetch(`${baseUrl}/v1/notes`, {
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
  rcUserId?: string,
  deviceId?: string
): Promise<UserEntitlementState> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/v1/credits/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${installationId}`,
      },
      body: JSON.stringify({
        installationId,
        deviceId,
        rcUserId,
        packageId: 'notes_20',
        creditsToAdd,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
    clearTimeout(timeoutId);
    console.warn('[API] syncPurchasedCredits failed:', error);
    throw error;
  }
}
