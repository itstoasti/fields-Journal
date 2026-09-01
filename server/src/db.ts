import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'fieldnotes.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    installation_id TEXT PRIMARY KEY,
    rc_user_id TEXT,
    free_used INTEGER NOT NULL DEFAULT 0,
    ad_used INTEGER NOT NULL DEFAULT 0,
    credits INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    place TEXT,
    number TEXT,
    status TEXT NOT NULL,
    cost_info TEXT,
    created_at TEXT NOT NULL
  );
`);

export interface UserRecord {
  installation_id: string;
  rc_user_id: string | null;
  free_used: number;
  ad_used: number;
  credits: number;
  created_at: string;
  updated_at: string;
}

export type EntitlementStatus = 'free' | 'ad' | 'credit' | 'paywall';

export function getOrCreateUser(installationId: string, rcUserId?: string): UserRecord {
  const existing = db.prepare('SELECT * FROM users WHERE installation_id = ?').get(installationId) as UserRecord | undefined;
  const now = new Date().toISOString();

  if (existing) {
    if (rcUserId && existing.rc_user_id !== rcUserId) {
      db.prepare('UPDATE users SET rc_user_id = ?, updated_at = ? WHERE installation_id = ?')
        .run(rcUserId, now, installationId);
      existing.rc_user_id = rcUserId;
    }
    return existing;
  }

  db.prepare(`
    INSERT INTO users (installation_id, rc_user_id, free_used, ad_used, credits, created_at, updated_at)
    VALUES (?, ?, 0, 0, 0, ?, ?)
  `).run(installationId, rcUserId || null, now, now);

  return {
    installation_id: installationId,
    rc_user_id: rcUserId || null,
    free_used: 0,
    ad_used: 0,
    credits: 0,
    created_at: now,
    updated_at: now,
  };
}

export function determineEntitlement(user: UserRecord): EntitlementStatus {
  if (user.free_used < 2) {
    return 'free';
  }
  if (user.free_used >= 2 && user.ad_used === 0) {
    return 'ad';
  }
  if (user.credits > 0) {
    return 'credit';
  }
  return 'paywall';
}

export function consumeUserEntitlement(installationId: string, entitlement: 'free' | 'ad' | 'credit'): boolean {
  const user = getOrCreateUser(installationId);
  const now = new Date().toISOString();

  if (entitlement === 'free') {
    if (user.free_used >= 2) return false;
    db.prepare('UPDATE users SET free_used = free_used + 1, updated_at = ? WHERE installation_id = ?')
      .run(now, installationId);
    return true;
  }

  if (entitlement === 'ad') {
    if (user.ad_used !== 0) return false;
    db.prepare('UPDATE users SET ad_used = 1, updated_at = ? WHERE installation_id = ?')
      .run(now, installationId);
    return true;
  }

  if (entitlement === 'credit') {
    if (user.credits <= 0) return false;
    db.prepare('UPDATE users SET credits = credits - 1, updated_at = ? WHERE installation_id = ?')
      .run(now, installationId);
    return true;
  }

  return false;
}

export function addCreditsToUser(installationId: string, amount: number, rcUserId?: string): UserRecord {
  const user = getOrCreateUser(installationId, rcUserId);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users 
    SET credits = credits + ?, rc_user_id = COALESCE(?, rc_user_id), updated_at = ? 
    WHERE installation_id = ?
  `).run(amount, rcUserId || null, now, installationId);

  return getOrCreateUser(installationId);
}

export function logGenerationRecord(
  id: string,
  userId: string,
  place: string,
  number: string,
  status: 'success' | 'failed',
  costInfo?: string
): void {
  db.prepare(`
    INSERT INTO generations (id, user_id, place, number, status, cost_info, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, place, number, status, costInfo || null, new Date().toISOString());
}
