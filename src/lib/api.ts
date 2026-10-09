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
      accountKey: data.accountKey || undefined,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export class ApiRequestError extends Error {
  code: string;
  title?: string;
  tip?: string;
  rawError?: string;
  userState?: any;

  constructor(
    message: string,
    details?: { code?: string; title?: string; tip?: string; rawError?: string; userState?: any }
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = details?.code || 'UNKNOWN_ERROR';
    this.title = details?.title;
    this.tip = details?.tip;
    this.rawError = details?.rawError;
    this.userState = details?.userState;
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
      const responseText = await response.text().catch(() => '');
      let errorJson: ApiError;
      try {
        errorJson = JSON.parse(responseText);
      } catch {
        if (responseText.includes('FUNCTION_PAYLOAD_TOO_LARGE') || response.status === 413) {
          errorJson = {
            error: 'PAYLOAD_TOO_LARGE',
            title: 'Photo Too Large',
            message: 'Photo payload is too large for cloud processing. Please try again.',
            tip: 'Try cropping or choosing a slightly smaller photo.',
          };
        } else if (responseText.includes('FUNCTION_INVOCATION_TIMEOUT') || response.status === 504) {
          errorJson = {
            error: 'TIMEOUT',
            title: 'The Press Timed Out',
            message: 'Server generation timed out. The model took too long to carve the plate. Please retry.',
            tip: 'Check your connection and tap Retry to run the press again.',
          };
        } else {
          errorJson = {
            error: 'NETWORK_ERROR',
            title: 'Connection Interrupted',
            message: `Server returned status ${response.status}. Please try again.`,
            tip: 'Check your internet connection and try again.',
            rawError: responseText,
          };
        }
      }

      const fullErrorStr = `${errorJson.error || ''} ${errorJson.message || ''} ${errorJson.rawError || ''} ${responseText}`;
      const isModeration =
        errorJson.error === 'CONTENT_MODERATED' ||
        fullErrorStr.includes('content-moderated') ||
        fullErrorStr.includes('content moderation') ||
        fullErrorStr.includes('rejected by content moderation');

      if (isModeration) {
        throw new ApiRequestError(
          errorJson.message || 'The AI printing press flagged this image under its automated safety guidelines.',
          {
            code: 'CONTENT_MODERATED',
            title: errorJson.title || 'Photo Could Not Be Pressed',
            tip:
              errorJson.tip ||
              'Try a wider landscape shot, an environmental scene (like exploring a trail or trees), or a photo without cartoon graphics on clothing.',
            rawError: errorJson.rawError || responseText || errorJson.message,
            userState: errorJson.userState,
          }
        );
      }

      throw new ApiRequestError(errorJson.message || errorJson.error || 'Field note generation failed.', {
        code: errorJson.error || 'GENERATION_FAILED',
        title: errorJson.title,
        tip: errorJson.tip,
        rawError: errorJson.rawError || responseText,
        userState: errorJson.userState,
      });
    }

    const data: GenerateNoteResponse = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiRequestError(
        'Connection timed out. The server took too long to generate your note. Your credits were not deducted.',
        {
          code: 'TIMEOUT',
          title: 'The Press Timed Out',
          tip: 'Please check your connection and tap Retry to try pressing again.',
        }
      );
    }
    throw error;
  }
}

export async function syncPurchasedCredits(
  installationId: string,
  creditsToAdd: number = 20,
  rcUserId?: string,
  deviceId?: string,
  transactionId?: string
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
        transactionId,
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

export async function linkAccountByKeyApi(
  installationId: string,
  accountKey: string,
  deviceId?: string
): Promise<{
  success: boolean;
  installationId: string;
  accountKey: string;
  credits: number;
  freeUsed: number;
  adUsed: boolean;
  entitlement: string;
}> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${baseUrl}/v1/account/link`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(baseUrl),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        installationId,
        accountKey: accountKey.trim().toUpperCase(),
        deviceId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({
        error: 'LINK_ERROR',
        message: `HTTP Error ${response.status}`,
      }));
      throw new Error(errorJson.message || errorJson.error || 'Failed to link account key.');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Permanently deletes user account and all server records (Apple Guideline 5.1.1(v) Compliance).
 */
export async function deleteAccountDataApi(
  installationId: string,
  accountKey?: string
): Promise<{ success: boolean; message?: string }> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${baseUrl}/v1/account/delete`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(baseUrl),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        installationId,
        accountKey: accountKey ? accountKey.trim().toUpperCase() : undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorJson.message || errorJson.error || 'Failed to delete account on server.',
      };
    }

    return { success: true };
  } catch (error: any) {
    clearTimeout(timeoutId);
    return { success: false, message: error.message || 'Network error deleting account.' };
  }
}

/**
 * Reports inappropriate, offensive, or infringing AI-generated content (Apple Guideline 1.2 Compliance).
 */
export async function reportInappropriateContentApi(
  installationId: string,
  reason: string,
  noteMetadata?: { id?: string; place?: string; number?: string; year?: string }
): Promise<{ success: boolean; message?: string }> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/v1/report`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(baseUrl),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        installationId,
        reason,
        noteMetadata,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, message: 'Server could not record report.' };
    }

    return { success: true };
  } catch (error: any) {
    clearTimeout(timeoutId);
    // Non-fatal: still return success to user gracefully
    return { success: true };
  }
}
