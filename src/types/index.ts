export type EntitlementType = 'free' | 'ad' | 'credit' | 'paywall';

export interface UserEntitlementState {
  freeUsed: number;       // 0, 1, 2
  adUsed: boolean;        // true if note 3 rewarded ad was completed and used
  credits: number;        // purchased balance from notes_20
  entitlement: EntitlementType;
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
  entitlement: 'free' | 'ad' | 'credit';
  installationId: string;
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
