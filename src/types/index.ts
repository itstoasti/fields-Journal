export type EntitlementType = 'free' | 'ad' | 'credit' | 'paywall' | 'pro';

export interface UserEntitlementState {
  freeUsed: number;       // 0, 1, 2
  adUsed: boolean;        // true if note 3 rewarded ad was completed and used
  credits: number;        // purchased balance from notes_20
  entitlement: EntitlementType;
  isPro?: boolean;        // true if user has active fields_travel_journal_scrapebook_pro subscription/entitlement
  accountKey?: string;    // Human-friendly account key (e.g. FIELD-XXXX-YYYY) for cross-device linking
}

export interface Note {
  id: string;
  createdAt: string;
  place: string;
  number: string;
  keywords: [string, string, string] | string[];
  year: string;
  sourceUri: string;
  posterUri: string;
  width: number;
  height: number;
}

export interface CaptionFields {
  place: string;
  number: string;
  keywords: [string, string, string];
  year: string;
}

export interface GenerateNoteRequest {
  imageBase64: string;
  mimeType?: string;
  place: string;
  number: string;
  keywords: string[];
  year: string;
  entitlement: 'free' | 'ad' | 'credit' | 'pro';
  installationId: string;
  deviceId?: string;
  rcUserId?: string;
  model?: string;
}

export interface GenerateNoteResponse {
  success: boolean;
  noteId: string;
  imageBase64?: string;
  imageUrl?: string;
  modelUsed: string;
  userState: {
    freeUsed: number;
    adUsed: boolean;
    credits: number;
    entitlement: EntitlementType;
  };
}

export interface ApiError {
  error: string;
  message: string;
  userState?: {
    freeUsed: number;
    adUsed: boolean;
    credits: number;
  };
}
