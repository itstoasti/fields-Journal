import { Platform } from 'react-native';
import { getApiBaseUrl } from './api';
import { getInstallationAndDeviceInfo } from './installation';

export const AnalyticsEvents = {
  APP_OPEN: 'app_open',
  SCREEN_VIEW: 'screen_view',
  COMPOSE_OPENED: 'compose_opened',
  PHOTO_SELECTED: 'photo_selected',
  PHOTO_PICKER_CANCELLED: 'photo_picker_cancelled',
  KEYWORDS_SUGGEST_CLICKED: 'keywords_suggest_clicked',
  PRESS_CLICKED: 'press_clicked',
  PRIVACY_MODAL_SHOWN: 'privacy_modal_shown',
  PRIVACY_MODAL_ACCEPTED: 'privacy_modal_accepted',
  PAYWALL_SHOWN: 'paywall_shown',
  PRESSING_STARTED: 'pressing_started',
  PRESSING_SUCCESS: 'pressing_success',
  PRESSING_FAILED: 'pressing_failed',
  NOTE_OPENED: 'note_opened',
  SETTINGS_OPENED: 'settings_opened',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents] | string;

let cachedIdentity: { installationId: string; deviceId: string } | null = null;

async function getIdentity(): Promise<{ installationId: string; deviceId: string }> {
  if (cachedIdentity) return cachedIdentity;
  try {
    cachedIdentity = await getInstallationAndDeviceInfo();
    return cachedIdentity;
  } catch {
    return { installationId: 'anon', deviceId: 'anon' };
  }
}

/**
 * Dispatches a telemetry event to the backend analytics engine.
 * Non-blocking, fire-and-forget: never throws or interrupts UI performance.
 */
export async function trackEvent(
  eventName: AnalyticsEventName,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const identity = await getIdentity();
    const baseUrl = getApiBaseUrl();
    const platform = Platform.OS;

    const payload = {
      installationId: identity.installationId,
      deviceId: identity.deviceId,
      eventName,
      platform,
      appVersion: '1.0.2',
      metadata: metadata || {},
    };

    // Non-blocking fetch with short 5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${baseUrl}/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(() => clearTimeout(timeoutId))
      .catch(() => clearTimeout(timeoutId));
  } catch {
    // Pure silence - analytics must never degrade user experience
  }
}
