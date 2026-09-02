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
    device_id TEXT,
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

// Safe column migration for existing databases
try {
  db.exec(`ALTER TABLE users ADD COLUMN device_id TEXT;`);
} catch {
  // Column already exists
}

db.exec(`CREATE INDEX IF NOT EXISTS idx_users_device_id ON users (device_id);`);

export interface UserRecord {
  installation_id: string;
  device_id: string | null;
  rc_user_id: string | null;
  free_used: number;
  ad_used: number;
  credits: number;
  created_at: string;
  updated_at: string;
}

export type EntitlementStatus = 'free' | 'ad' | 'credit' | 'paywall';

/**
 * Resolves or creates a user record.
 * Persistent Anti-Abuse:
 * If a matching device_id exists, re-links installation_id to the persistent record
 * so users cannot reset their 2 free notes by clearing app data or reinstalling.
 */
export function getOrCreateUser(
  installationId: string,
  rcUserId?: string,
  deviceId?: string
): UserRecord {
  const now = new Date().toISOString();

  // 1. Check persistent hardware deviceId first
  if (deviceId && deviceId.trim().length > 0) {
    const existingByDevice = db
      .prepare('SELECT * FROM users WHERE device_id = ? LIMIT 1')
      .get(deviceId.trim()) as UserRecord | undefined;

    if (existingByDevice) {
      // Re-link new installationId to this persistent hardware device
      if (existingByDevice.installation_id !== installationId) {
        console.log(`[Anti-Abuse] Persistent device recognized (${deviceId}). Re-linking install ${installationId} -> original user with ${existingByDevice.free_used} free used.`);
        db.prepare(
          'UPDATE users SET installation_id = ?, rc_user_id = COALESCE(?, rc_user_id), updated_at = ? WHERE device_id = ?'
        ).run(installationId, rcUserId || null, now, deviceId.trim());
        existingByDevice.installation_id = installationId;
      }
      if (rcUserId && existingByDevice.rc_user_id !== rcUserId) {
        existingByDevice.rc_user_id = rcUserId;
      }
      return existingByDevice;
    }
  }

  // 2. Check by installationId
  const existing = db
    .prepare('SELECT * FROM users WHERE installation_id = ? LIMIT 1')
    .get(installationId) as UserRecord | undefined;

  if (existing) {
    let shouldUpdate = false;
    let newDeviceId = existing.device_id;
    let newRcUserId = existing.rc_user_id;

    if (deviceId && !existing.device_id) {
      newDeviceId = deviceId.trim();
      shouldUpdate = true;
    }
    if (rcUserId && existing.rc_user_id !== rcUserId) {
      newRcUserId = rcUserId;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      db.prepare(
        'UPDATE users SET device_id = ?, rc_user_id = ?, updated_at = ? WHERE installation_id = ?'
      ).run(newDeviceId, newRcUserId, now, installationId);
      existing.device_id = newDeviceId;
      existing.rc_user_id = newRcUserId;
    }
    return existing;
  }

  // 3. Insert brand new user with hardware device_id
  db.prepare(`
    INSERT INTO users (installation_id, device_id, rc_user_id, free_used, ad_used, credits, created_at, updated_at)
    VALUES (?, ?, ?, 0, 0, 0, ?, ?)
  `).run(installationId, deviceId ? deviceId.trim() : null, rcUserId || null, now, now);

  return {
    installation_id: installationId,
    device_id: deviceId ? deviceId.trim() : null,
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

export function consumeUserEntitlement(
  installationId: string,
  entitlement: 'free' | 'ad' | 'credit',
  deviceId?: string
): boolean {
  const user = getOrCreateUser(installationId, undefined, deviceId);
  const now = new Date().toISOString();
  const targetId = user.installation_id;

  if (entitlement === 'free') {
    if (user.free_used >= 2) return false;
    db.prepare('UPDATE users SET free_used = free_used + 1, updated_at = ? WHERE installation_id = ?')
      .run(now, targetId);
    return true;
  }

  if (entitlement === 'ad') {
    if (user.ad_used !== 0) return false;
    db.prepare('UPDATE users SET ad_used = 1, updated_at = ? WHERE installation_id = ?')
      .run(now, targetId);
    return true;
  }

  if (entitlement === 'credit') {
    if (user.credits <= 0) return false;
    db.prepare('UPDATE users SET credits = credits - 1, updated_at = ? WHERE installation_id = ?')
      .run(now, targetId);
    return true;
  }

  return false;
}

export function addCreditsToUser(
  installationId: string,
  amount: number,
  rcUserId?: string,
  deviceId?: string
): UserRecord {
  const user = getOrCreateUser(installationId, rcUserId, deviceId);
  const now = new Date().toISOString();
  const targetId = user.installation_id;

  db.prepare(`
    UPDATE users 
    SET credits = credits + ?, rc_user_id = COALESCE(?, rc_user_id), updated_at = ? 
    WHERE installation_id = ?
  `).run(amount, rcUserId || null, now, targetId);

  return getOrCreateUser(targetId, undefined, deviceId);
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
