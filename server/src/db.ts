import { createClient, Client } from '@libsql/client/web';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Ensure environment variables are loaded immediately on module load
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });
dotenv.config();

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

export type EntitlementStatus = 'free' | 'ad' | 'credit' | 'paywall' | 'pro';

// 1. Resolve connection config (Turso cloud or local SQLite file)
const isTurso = Boolean(process.env.TURSO_DATABASE_URL);
const dbUrl = process.env.TURSO_DATABASE_URL || (() => {
  const localDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      // Ignored in read-only environments
    }
  }
  return `file:${path.resolve(localDir, 'fieldnotes.db')}`;
})();

export const client: Client = createClient({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize Schema
export async function initDb(): Promise<void> {
  try {
    await client.execute(`
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
    `);

    await client.execute(`
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

    try {
      await client.execute(`ALTER TABLE users ADD COLUMN device_id TEXT;`);
    } catch {
      // Column already exists
    }

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_device_id ON users (device_id);`);
    console.log(`[Database] Initialized successfully (${isTurso ? 'Turso Cloud' : 'Local SQLite'})`);
  } catch (err) {
    console.error('[Database] Schema initialization warning:', err);
  }
}

// Automatically initialize schema on module load
initDb().catch(console.error);

function mapRowToUser(row: any): UserRecord {
  return {
    installation_id: String(row.installation_id),
    device_id: row.device_id ? String(row.device_id) : null,
    rc_user_id: row.rc_user_id ? String(row.rc_user_id) : null,
    free_used: Number(row.free_used || 0),
    ad_used: Number(row.ad_used || 0),
    credits: Number(row.credits || 0),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  };
}

/**
 * Resolves or creates a user record.
 * Persistent Anti-Abuse:
 * If a matching device_id exists, re-links installation_id to the persistent record
 * so users cannot reset their free notes by clearing app data or reinstalling.
 */
export async function getOrCreateUser(
  installationId: string,
  rcUserId?: string,
  deviceId?: string
): Promise<UserRecord> {
  const now = new Date().toISOString();

  // 1. Check persistent hardware deviceId first
  if (deviceId && deviceId.trim().length > 0) {
    const existingByDeviceRes = await client.execute({
      sql: 'SELECT * FROM users WHERE device_id = ? LIMIT 1',
      args: [deviceId.trim()],
    });

    if (existingByDeviceRes.rows.length > 0) {
      const existingByDevice = mapRowToUser(existingByDeviceRes.rows[0]);

      if (existingByDevice.installation_id !== installationId) {
        console.log(`[Anti-Abuse] Persistent device recognized (${deviceId}). Re-linking install ${installationId} -> original user with ${existingByDevice.free_used} free used.`);
        await client.execute({
          sql: 'UPDATE users SET installation_id = ?, rc_user_id = COALESCE(?, rc_user_id), updated_at = ? WHERE device_id = ?',
          args: [installationId, rcUserId || null, now, deviceId.trim()],
        });
        existingByDevice.installation_id = installationId;
      }
      if (rcUserId && existingByDevice.rc_user_id !== rcUserId) {
        existingByDevice.rc_user_id = rcUserId;
      }
      return existingByDevice;
    }
  }

  // 2. Check by installationId
  const existingRes = await client.execute({
    sql: 'SELECT * FROM users WHERE installation_id = ? LIMIT 1',
    args: [installationId],
  });

  if (existingRes.rows.length > 0) {
    const existing = mapRowToUser(existingRes.rows[0]);
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
      await client.execute({
        sql: 'UPDATE users SET device_id = ?, rc_user_id = ?, updated_at = ? WHERE installation_id = ?',
        args: [newDeviceId, newRcUserId, now, installationId],
      });
      existing.device_id = newDeviceId;
      existing.rc_user_id = newRcUserId;
    }
    return existing;
  }

  // 3. Insert brand new user with hardware device_id
  await client.execute({
    sql: `INSERT INTO users (installation_id, device_id, rc_user_id, free_used, ad_used, credits, created_at, updated_at)
          VALUES (?, ?, ?, 0, 0, 0, ?, ?)`,
    args: [installationId, deviceId ? deviceId.trim() : null, rcUserId || null, now, now],
  });

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

export async function consumeUserEntitlement(
  installationId: string,
  entitlement: 'free' | 'ad' | 'credit' | 'pro',
  deviceId?: string
): Promise<boolean> {
  if (entitlement === 'pro') {
    // Pro subscribers have active subscription; no quota or credits deducted
    return true;
  }

  const user = await getOrCreateUser(installationId, undefined, deviceId);
  const now = new Date().toISOString();
  const targetId = user.installation_id;

  if (entitlement === 'free') {
    if (user.free_used >= 2) return false;
    await client.execute({
      sql: 'UPDATE users SET free_used = free_used + 1, updated_at = ? WHERE installation_id = ?',
      args: [now, targetId],
    });
    return true;
  }

  if (entitlement === 'ad') {
    if (user.ad_used !== 0) return false;
    await client.execute({
      sql: 'UPDATE users SET ad_used = 1, updated_at = ? WHERE installation_id = ?',
      args: [now, targetId],
    });
    return true;
  }

  if (entitlement === 'credit') {
    if (user.credits <= 0) return false;
    await client.execute({
      sql: 'UPDATE users SET credits = credits - 1, updated_at = ? WHERE installation_id = ?',
      args: [now, targetId],
    });
    return true;
  }

  return false;
}

export async function addCreditsToUser(
  installationId: string,
  amount: number,
  rcUserId?: string,
  deviceId?: string
): Promise<UserRecord> {
  const user = await getOrCreateUser(installationId, rcUserId, deviceId);
  const now = new Date().toISOString();
  const targetId = user.installation_id;

  await client.execute({
    sql: `UPDATE users 
          SET credits = credits + ?, rc_user_id = COALESCE(?, rc_user_id), updated_at = ? 
          WHERE installation_id = ?`,
    args: [amount, rcUserId || null, now, targetId],
  });

  return getOrCreateUser(targetId, undefined, deviceId);
}

export async function logGenerationRecord(
  id: string,
  userId: string,
  place: string,
  number: string,
  status: 'success' | 'failed',
  costInfo?: string
): Promise<void> {
  try {
    await client.execute({
      sql: `INSERT INTO generations (id, user_id, place, number, status, cost_info, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, place, number, status, costInfo || null, new Date().toISOString()],
    });
  } catch (err) {
    console.warn('[Database] Failed to log generation record:', err);
  }
}
