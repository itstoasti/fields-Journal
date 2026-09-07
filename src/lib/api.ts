import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { GenerateNoteRequest, GenerateNoteResponse, UserEntitlementState, ApiError } from '../types';

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // If running on web in a deployed environment (Vercel production/preview domain)
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    return window.location.origin;
  }

  // 100% Cloud Serverless API on Vercel + Turso Cloud SQLite
  return 'https://fields-journal.vercel.app';
}

const getCommonHeaders = (baseUrl: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (baseUrl.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  return headers;
};

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
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${baseUrl}/v1/me?${query.toString()}`, {
      method: 'GET',
      headers: {
        ...getCommonHeaders(baseUrl),
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
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s client timeout

  try {
    const response = await fetch(`${baseUrl}/v1/notes`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(baseUrl),
        'Content-Type': 'application/json',
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
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/v1/credits/sync`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(baseUrl),
        'Content-Type': 'application/json',
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

export interface KeywordSuggestionResponse {
  success: boolean;
  keywords: string[];
  formatted: string;
  source: string;
}

export async function suggestKeywordsFromImage(
  imageBase64: string,
  location?: string
): Promise<KeywordSuggestionResponse> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(`${baseUrl}/v1/keywords/suggest`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(baseUrl),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: 'image/jpeg',
        location: location || '',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Keywords API failed with status ${response.status}`);
    }

    const data: KeywordSuggestionResponse = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.warn('[API] suggestKeywordsFromImage failed:', error);
    throw error;
  }
}
