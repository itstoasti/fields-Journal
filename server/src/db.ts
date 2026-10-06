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
  account_key?: string | null;
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

    try {
      await client.execute(`ALTER TABLE users ADD COLUMN account_key TEXT;`);
    } catch {
      // Column already exists
    }

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_device_id ON users (device_id);`);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_account_key ON users (account_key);`);
    console.log(`[Database] Initialized successfully (${isTurso ? 'Turso Cloud' : 'Local SQLite'})`);
  } catch (err) {
    console.error('[Database] Schema initialization warning:', err);
  }
}

// Automatically initialize schema on module load
initDb().catch(console.error);

export function generateAccountKey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `FIELD-${part1}-${part2}`;
}

function mapRowToUser(row: any): UserRecord {
  return {
    installation_id: String(row.installation_id),
    device_id: row.device_id ? String(row.device_id) : null,
    rc_user_id: row.rc_user_id ? String(row.rc_user_id) : null,
    account_key: row.account_key ? String(row.account_key) : null,
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
        const oldInstallId = existingByDevice.installation_id;
        await client.execute({
          sql: 'UPDATE users SET installation_id = ?, rc_user_id = COALESCE(?, rc_user_id), updated_at = ? WHERE device_id = ?',
          args: [installationId, rcUserId || null, now, deviceId.trim()],
        });
        try {
          await client.execute({
            sql: 'UPDATE generations SET user_id = ? WHERE user_id = ?',
            args: [installationId, oldInstallId],
          });
        } catch {
          // Non-critical
        }
        existingByDevice.installation_id = installationId;
      }
      if (rcUserId && existingByDevice.rc_user_id !== rcUserId) {
        existingByDevice.rc_user_id = rcUserId;
      }
      if (!existingByDevice.account_key) {
        const key = generateAccountKey();
        await client.execute({
          sql: 'UPDATE users SET account_key = ? WHERE installation_id = ?',
          args: [key, existingByDevice.installation_id],
        });
        existingByDevice.account_key = key;
      }

      // Heartbeat: touch updated_at if > 15 minutes since last check-in
      const lastDevUpdateMs = new Date(existingByDevice.updated_at).getTime();
      if (isNaN(lastDevUpdateMs) || Date.now() - lastDevUpdateMs > 15 * 60 * 1000) {
        await client.execute({
          sql: 'UPDATE users SET updated_at = ? WHERE device_id = ?',
          args: [now, deviceId.trim()],
        });
        existingByDevice.updated_at = now;
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
    if (!existing.account_key) {
      const key = generateAccountKey();
      await client.execute({
        sql: 'UPDATE users SET account_key = ? WHERE installation_id = ?',
        args: [key, existing.installation_id],
      });
      existing.account_key = key;
    }

    // Heartbeat: touch updated_at if > 15 minutes since last check-in
    const lastInstUpdateMs = new Date(existing.updated_at).getTime();
    if (isNaN(lastInstUpdateMs) || Date.now() - lastInstUpdateMs > 15 * 60 * 1000) {
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await client.execute({
        sql: 'UPDATE users SET device_id = ?, rc_user_id = ?, updated_at = ? WHERE installation_id = ?',
        args: [newDeviceId, newRcUserId, now, installationId],
      });
      existing.device_id = newDeviceId;
      existing.rc_user_id = newRcUserId;
      existing.updated_at = now;
    }
    return existing;
  }

  // 3. Insert brand new user with hardware device_id & unique account_key
  const accountKey = generateAccountKey();
  await client.execute({
    sql: `INSERT INTO users (installation_id, device_id, rc_user_id, account_key, free_used, ad_used, credits, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)`,
    args: [installationId, deviceId ? deviceId.trim() : null, rcUserId || null, accountKey, now, now],
  });

  return {
    installation_id: installationId,
    device_id: deviceId ? deviceId.trim() : null,
    rc_user_id: rcUserId || null,
    account_key: accountKey,
    free_used: 0,
    ad_used: 0,
    credits: 0,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Cross-Device Account Linking via Account Key (e.g. FIELD-XXXX-YYYY).
 * Finds the account owned by targetAccountKey, merges any local purchased credits,
 * and returns the master account record.
 */
export async function linkAccountByKey(
  currentInstallationId: string,
  rawAccountKey: string,
  deviceId?: string
): Promise<UserRecord> {
  const now = new Date().toISOString();
  const normalizedKey = rawAccountKey.trim().toUpperCase();

  if (!normalizedKey || normalizedKey.length < 8) {
    throw new Error('Invalid Account Key format. Expected FIELD-XXXX-YYYY.');
  }

  // 1. Find target master account
  const res = await client.execute({
    sql: 'SELECT * FROM users WHERE UPPER(account_key) = ? LIMIT 1',
    args: [normalizedKey],
  });

  if (res.rows.length === 0) {
    throw new Error('Account key not found. Please check your key from Settings on your other device.');
  }

  const targetUser = mapRowToUser(res.rows[0]);

  // 2. If current installation is different, merge any local credits
  if (targetUser.installation_id !== currentInstallationId) {
    const currentRes = await client.execute({
      sql: 'SELECT * FROM users WHERE installation_id = ? LIMIT 1',
      args: [currentInstallationId],
    });

    if (currentRes.rows.length > 0) {
      const currentUser = mapRowToUser(currentRes.rows[0]);
      if (currentUser.credits > 0) {
        console.log(`[Account Link] Merging ${currentUser.credits} credits from ${currentInstallationId} -> ${targetUser.installation_id}`);
        await client.execute({
          sql: 'UPDATE users SET credits = credits + ?, updated_at = ? WHERE installation_id = ?',
          args: [currentUser.credits, now, targetUser.installation_id],
        });
        await client.execute({
          sql: 'UPDATE users SET credits = 0, updated_at = ? WHERE installation_id = ?',
          args: [now, currentInstallationId],
        });
        targetUser.credits += currentUser.credits;
      }
    }

    // Associate target user with current device ID if provided
    if (deviceId && deviceId.trim().length > 0) {
      await client.execute({
        sql: 'UPDATE users SET device_id = ?, updated_at = ? WHERE installation_id = ?',
        args: [deviceId.trim(), now, targetUser.installation_id],
      });
      targetUser.device_id = deviceId.trim();
    }
  }

  return targetUser;
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

export interface AdminStats {
  activeModel: string;
  android: {
    total: number;
    last24h: number;
    last3d: number;
    last7d: number;
    activeDevices: number;
  };
  web: {
    total: number;
    last24h: number;
    last7d: number;
  };
  users: {
    total: number;
    last24h: number;
    last7d: number;
    payingCount: number;
    freeUsedTotal: number;
    adsWatchedTotal: number;
    creditsBalanceTotal: number;
  };
  generations: {
    total: number;
    last24h: number;
    last7d: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  topDestinations: Array<{ place: string; count: number }>;
  recentActivity: Array<{
    id: string;
    userId: string;
    place: string;
    number: string;
    status: string;
    costInfo: string | null;
    createdAt: string;
  }>;
}

export async function getSystemSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const res = await client.execute({
      sql: 'SELECT value FROM app_settings WHERE key = ? LIMIT 1',
      args: [key],
    });
    if (res.rows.length > 0 && res.rows[0].value) {
      return String(res.rows[0].value);
    }
  } catch {
    // If table doesn't exist yet
  }
  return defaultValue;
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await client.execute({
    sql: `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [key, value, now],
  });
}

export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const LAUNCH_DATE = '2026-10-01T00:00:00.000Z';

  // Strict filters: Only track data from October 1 onward, and exclude developer test scripts
  const testUserFilter = `created_at >= '${LAUNCH_DATE}' AND installation_id NOT LIKE 'test_%' AND installation_id NOT LIKE 'verify_%' AND installation_id != 'prod_verified' AND installation_id NOT LIKE '%probe%'`;
  const testGenFilter = `created_at >= '${LAUNCH_DATE}' AND user_id NOT LIKE 'test_%' AND user_id NOT LIKE 'verify_%' AND user_id NOT LIKE '%probe%'`;

  const [
    activeModel,
    androidTotalRes,
    androidDayRes,
    androidThreeDayRes,
    androidWeekRes,
    androidActiveRes,
    webTotalRes,
    webDayRes,
    webWeekRes,
    usersTotal,
    genTotal,
    genDay,
    genWeek,
    topPlacesRes,
    recentFeedRes,
  ] = await Promise.all([
    getSystemSetting('active_model', 'grok-imagine-image-2.0'),

    // 1. Android App Devices (Google Play)
    client.execute(`SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND ${testUserFilter}`),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND created_at >= ? AND ${testUserFilter}`, args: [dayAgo] }),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND created_at >= ? AND ${testUserFilter}`, args: [threeDaysAgo] }),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND created_at >= ? AND ${testUserFilter}`, args: [weekAgo] }),
    // Active devices: checked in within the last 48 hours (matches Google Play installed active audience, excluding uninstalls)
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND updated_at >= ? AND ${testUserFilter}`, args: [twoDaysAgo] }),

    // 2. Web Visitors
    client.execute(`SELECT COUNT(*) as c FROM users WHERE (device_id LIKE 'web_%' OR device_id IS NULL) AND ${testUserFilter}`),
    client.execute({ sql: `SELECT COUNT(*) as c FROM users WHERE (device_id LIKE 'web_%' OR device_id IS NULL) AND created_at >= ? AND ${testUserFilter}`, args: [dayAgo] }),
    client.execute({ sql: `SELECT COUNT(*) as c FROM users WHERE (device_id LIKE 'web_%' OR device_id IS NULL) AND created_at >= ? AND ${testUserFilter}`, args: [weekAgo] }),

    // 3. Monetization totals across all real users
    client.execute(`
      SELECT 
        COUNT(*) as c, 
        SUM(free_used) as free_used, 
        SUM(ad_used) as ads, 
        SUM(credits) as credits, 
        SUM(CASE WHEN credits > 0 THEN 1 ELSE 0 END) as paying 
      FROM users WHERE ${testUserFilter}
    `),

    // 4. Generations (excluding developer test probes)
    client.execute(`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success, 
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed 
      FROM generations WHERE ${testGenFilter}
    `),
    client.execute({ sql: `SELECT COUNT(*) as c FROM generations WHERE created_at >= ? AND ${testGenFilter}`, args: [dayAgo] }),
    client.execute({ sql: `SELECT COUNT(*) as c FROM generations WHERE created_at >= ? AND ${testGenFilter}`, args: [weekAgo] }),

    // 5. Top Places
    client.execute(`
      SELECT place, COUNT(*) as count 
      FROM generations 
      WHERE place IS NOT NULL AND place != '' AND ${testGenFilter} 
      GROUP BY place 
      ORDER BY count DESC 
      LIMIT 8
    `),

    // 6. Recent generations
    client.execute(`
      SELECT id, user_id, place, number, status, cost_info, created_at 
      FROM generations 
      WHERE ${testGenFilter} 
      ORDER BY created_at DESC 
      LIMIT 20
    `),
  ]);

  const uRow = usersTotal.rows[0] || {};
  const gRow = genTotal.rows[0] || {};

  const totalGens = Number(gRow.total || 0);
  const successGens = Number(gRow.success || 0);
  const successRate = totalGens > 0 ? Math.round((successGens / totalGens) * 100) : 100;

  const androidTotal = Number(androidTotalRes.rows[0]?.c || 0);
  const androidDay = Number(androidDayRes.rows[0]?.c || 0);
  const android3d = Number(androidThreeDayRes.rows[0]?.c || 0);
  const androidWeek = Number(androidWeekRes.rows[0]?.c || 0);
  const androidActive = Number(androidActiveRes.rows[0]?.c || 0);

  const webTotal = Number(webTotalRes.rows[0]?.c || 0);
  const webDay = Number(webDayRes.rows[0]?.c || 0);
  const webWeek = Number(webWeekRes.rows[0]?.c || 0);

  return {
    activeModel: String(activeModel),
    android: {
      total: androidTotal,
      last24h: androidDay,
      last3d: android3d,
      last7d: androidWeek,
      activeDevices: androidActive,
    },
    web: {
      total: webTotal,
      last24h: webDay,
      last7d: webWeek,
    },
    users: {
      total: androidTotal, // Point to real Android count for backward-compatible consumers
      last24h: androidDay,
      last7d: androidWeek,
      payingCount: Number(uRow.paying || 0),
      freeUsedTotal: Number(uRow.free_used || 0),
      adsWatchedTotal: Number(uRow.ads || 0),
      creditsBalanceTotal: Number(uRow.credits || 0),
    },
    generations: {
      total: totalGens,
      last24h: Number(genDay.rows[0]?.c || 0),
      last7d: Number(genWeek.rows[0]?.c || 0),
      successful: successGens,
      failed: Number(gRow.failed || 0),
      successRate,
    },
    topDestinations: topPlacesRes.rows.map((r: any) => ({
      place: String(r.place),
      count: Number(r.count),
    })),
    recentActivity: recentFeedRes.rows.map((r: any) => ({
      id: String(r.id),
      userId: String(r.user_id),
      place: String(r.place || 'Unknown'),
      number: String(r.number || '01'),
      status: String(r.status),
      costInfo: r.cost_info ? String(r.cost_info) : null,
      createdAt: String(r.created_at),
    })),
  };
}
