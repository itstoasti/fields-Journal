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
  is_developer?: number;
  is_pro?: number;
  pro_expires_at?: string | null;
}

export type EntitlementStatus = 'free' | 'ad' | 'credit' | 'paywall' | 'pro';

// Known internal/developer devices to exclude from public store customer metrics
export const KNOWN_DEVELOPER_DEVICES = [
  'android_fc341bad05cf8c5a', // Developer physical Android test device
  'dev_ygv47mz4tj2x5zw31z1ez4gz', // Developer web/emulator
];

export function isDeveloperDevice(deviceId?: string | null, installationId?: string | null): boolean {
  if (deviceId) {
    const trimmed = deviceId.trim();
    if (KNOWN_DEVELOPER_DEVICES.includes(trimmed)) return true;
  }
  return false;
}

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

    try {
      await client.execute(`ALTER TABLE users ADD COLUMN is_developer INTEGER DEFAULT 0;`);
    } catch {
      // Column already exists
    }

    try {
      await client.execute(`ALTER TABLE users ADD COLUMN is_pro INTEGER DEFAULT 0;`);
    } catch {
      // Column already exists
    }

    try {
      await client.execute(`ALTER TABLE users ADD COLUMN pro_expires_at TEXT;`);
    } catch {
      // Column already exists
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS processed_purchases (
        transaction_id TEXT PRIMARY KEY,
        installation_id TEXT NOT NULL,
        package_id TEXT NOT NULL,
        credits_added INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        installation_id TEXT,
        reason TEXT,
        note_metadata TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS app_events (
        id TEXT PRIMARY KEY,
        installation_id TEXT NOT NULL,
        device_id TEXT,
        event_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        app_version TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // Automatically tag known developer devices as internal
    await client.execute(`
      UPDATE users 
      SET is_developer = 1 
      WHERE device_id IN ('android_fc341bad05cf8c5a', 'dev_ygv47mz4tj2x5zw31z1ez4gz')
    `);

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_device_id ON users (device_id);`);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_account_key ON users (account_key);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_purchases_inst ON processed_purchases (installation_id);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_events_name ON app_events (event_name);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_events_created ON app_events (created_at);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_events_device ON app_events (device_id);`);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        seo_title TEXT,
        meta_description TEXT,
        content_markdown TEXT NOT NULL,
        content_html TEXT NOT NULL,
        focus_keywords TEXT,
        featured_image_url TEXT,
        featured_image_alt TEXT,
        featured_image_caption TEXT,
        canonical_url TEXT,
        robots TEXT DEFAULT 'index, follow',
        schema_type TEXT DEFAULT 'Article',
        faq_items TEXT,
        author TEXT DEFAULT 'Fields Editorial',
        seo_score INTEGER DEFAULT 0,
        seo_feedback TEXT,
        status TEXT NOT NULL DEFAULT 'published',
        view_count INTEGER NOT NULL DEFAULT 0,
        reading_time_minutes INTEGER NOT NULL DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts (slug);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts (status);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_blog_posts_created ON blog_posts (created_at);`);
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
    is_developer: Number(row.is_developer || 0),
    is_pro: Number(row.is_pro || 0),
    pro_expires_at: row.pro_expires_at ? String(row.pro_expires_at) : null,
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

      const isDev = isDeveloperDevice(deviceId, installationId) ? 1 : 0;
      if (isDev && !existingByDevice.is_developer) {
        await client.execute({
          sql: 'UPDATE users SET is_developer = 1 WHERE device_id = ?',
          args: [deviceId.trim()],
        });
        existingByDevice.is_developer = 1;
      }

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
    const isDev = isDeveloperDevice(deviceId || existing.device_id, installationId) ? 1 : 0;

    if (isDev && !existing.is_developer) {
      shouldUpdate = true;
    }
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
      const devVal = (isDev || existing.is_developer) ? 1 : 0;
      await client.execute({
        sql: 'UPDATE users SET device_id = ?, rc_user_id = ?, is_developer = ?, updated_at = ? WHERE installation_id = ?',
        args: [newDeviceId, newRcUserId, devVal, now, installationId],
      });
      existing.device_id = newDeviceId;
      existing.rc_user_id = newRcUserId;
      existing.is_developer = devVal;
      existing.updated_at = now;
    }
    return existing;
  }

  // 3. Insert brand new user with hardware device_id & unique account_key
  const isDev = isDeveloperDevice(deviceId, installationId) ? 1 : 0;
  const accountKey = generateAccountKey();
  await client.execute({
    sql: `INSERT INTO users (installation_id, device_id, rc_user_id, account_key, free_used, ad_used, credits, created_at, updated_at, is_developer)
          VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?)`,
    args: [installationId, deviceId ? deviceId.trim() : null, rcUserId || null, accountKey, now, now, isDev],
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
    is_developer: isDev,
    is_pro: 0,
    pro_expires_at: null,
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

  // 2. If current installation is different, merge any local credits AND usage
  if (targetUser.installation_id !== currentInstallationId) {
    const currentRes = await client.execute({
      sql: 'SELECT * FROM users WHERE installation_id = ? LIMIT 1',
      args: [currentInstallationId],
    });

    let localCredits = 0;
    let localFreeUsed = 0;
    let localAdUsed = 0;

    if (currentRes.rows.length > 0) {
      const currentUser = mapRowToUser(currentRes.rows[0]);
      localCredits = currentUser.credits;
      localFreeUsed = currentUser.free_used;
      localAdUsed = currentUser.ad_used;
    }

    // Check if the physical hardware device already has recorded usage
    let hwFreeUsed = 0;
    let hwAdUsed = 0;
    if (deviceId && deviceId.trim().length > 0) {
      const hwRes = await client.execute({
        sql: 'SELECT MAX(free_used) as max_free, MAX(ad_used) as max_ad FROM users WHERE device_id = ?',
        args: [deviceId.trim()],
      });
      if (hwRes.rows.length > 0) {
        hwFreeUsed = Number(hwRes.rows[0].max_free || 0);
        hwAdUsed = Number(hwRes.rows[0].max_ad || 0);
      }
    }

    // Anti-Abuse: Starter free notes and ad notes NEVER reset upon account linking.
    // Preserves maximum usage across all linked instances and hardware.
    const mergedFreeUsed = Math.max(targetUser.free_used, localFreeUsed, hwFreeUsed);
    const mergedAdUsed = Math.max(targetUser.ad_used, localAdUsed, hwAdUsed);

    if (localCredits > 0) {
      console.log(`[Account Link] Merging ${localCredits} credits from ${currentInstallationId} -> ${targetUser.installation_id}`);
      targetUser.credits += localCredits;
    }

    await client.execute({
      sql: `UPDATE users 
            SET credits = credits + ?,
                free_used = ?,
                ad_used = ?,
                device_id = COALESCE(?, device_id),
                updated_at = ? 
            WHERE installation_id = ?`,
      args: [
        localCredits,
        mergedFreeUsed,
        mergedAdUsed,
        deviceId ? deviceId.trim() : null,
        now,
        targetUser.installation_id,
      ],
    });

    targetUser.free_used = mergedFreeUsed;
    targetUser.ad_used = mergedAdUsed;
    if (deviceId && deviceId.trim().length > 0) {
      targetUser.device_id = deviceId.trim();
    }

    // Zero out old installation record and detach device_id so hardware 1:1 mapping stays clean
    await client.execute({
      sql: 'UPDATE users SET credits = 0, device_id = NULL, updated_at = ? WHERE installation_id = ?',
      args: [now, currentInstallationId],
    });
  }

  return targetUser;
}

/**
 * Permanently deletes user record and associated identity data (Apple Guideline 5.1.1(v) Compliance).
 */
export async function deleteUserAccount(installationId: string, accountKey?: string): Promise<boolean> {
  if (accountKey && accountKey.trim().length > 0) {
    const normalizedKey = accountKey.trim().toUpperCase();
    await client.execute({
      sql: 'DELETE FROM users WHERE UPPER(account_key) = ? OR installation_id = ?',
      args: [normalizedKey, installationId],
    });
  } else {
    await client.execute({
      sql: 'DELETE FROM users WHERE installation_id = ?',
      args: [installationId],
    });
  }
  return true;
}

/**
 * Logs user content reports for inappropriate or offensive outputs (Apple Guideline 1.2 Compliance).
 */
export async function logContentReport(
  installationId: string,
  reason: string,
  noteMetadata?: any
): Promise<void> {
  const id = `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  await client.execute({
    sql: 'INSERT INTO reports (id, installation_id, reason, note_metadata, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, installationId, reason, noteMetadata ? JSON.stringify(noteMetadata) : null, now],
  });
}

export function determineEntitlement(user: UserRecord): EntitlementStatus {
  if (user.is_pro) {
    if (user.pro_expires_at) {
      const expTime = new Date(user.pro_expires_at).getTime();
      if (!isNaN(expTime) && expTime > Date.now()) {
        return 'pro';
      }
    } else {
      // Lifetime Pro (no expiration)
      return 'pro';
    }
  }
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

export interface ReservationResult {
  success: boolean;
  entitlement: EntitlementStatus;
  user: UserRecord;
  error?: string;
}

/**
 * Atomically reserves a generation slot BEFORE invoking the AI model.
 * Eliminates TOCTOU race conditions where multiple parallel requests consume a single credit.
 */
export async function reserveEntitlement(
  installationId: string,
  deviceId?: string,
  rcUserId?: string
): Promise<ReservationResult> {
  const user = await getOrCreateUser(installationId, rcUserId, deviceId);
  const now = new Date().toISOString();
  const targetId = user.installation_id;

  // 1. Pro Subscription check
  if (user.is_pro) {
    if (!user.pro_expires_at || new Date(user.pro_expires_at).getTime() > Date.now()) {
      return { success: true, entitlement: 'pro', user };
    }
  }

  // 2. Free Starter Note atomic reservation (notes 1 & 2)
  if (user.free_used < 2) {
    const res = await client.execute({
      sql: `UPDATE users 
            SET free_used = free_used + 1, updated_at = ? 
            WHERE installation_id = ? AND free_used < 2`,
      args: [now, targetId],
    });
    if (res.rowsAffected > 0) {
      user.free_used += 1;
      return { success: true, entitlement: 'free', user };
    }
  }

  // 3. Rewarded Ad Note atomic reservation (note 3)
  if (user.free_used >= 2 && user.ad_used === 0) {
    const res = await client.execute({
      sql: `UPDATE users 
            SET ad_used = 1, updated_at = ? 
            WHERE installation_id = ? AND free_used >= 2 AND ad_used = 0`,
      args: [now, targetId],
    });
    if (res.rowsAffected > 0) {
      user.ad_used = 1;
      return { success: true, entitlement: 'ad', user };
    }
  }

  // 4. Purchased Credits atomic reservation (note 4+)
  const creditRes = await client.execute({
    sql: `UPDATE users 
          SET credits = credits - 1, updated_at = ? 
          WHERE installation_id = ? AND credits > 0`,
    args: [now, targetId],
  });

  if (creditRes.rowsAffected > 0) {
    user.credits -= 1;
    return { success: true, entitlement: 'credit', user };
  }

  // Paywall required
  return {
    success: false,
    entitlement: 'paywall',
    user,
    error: 'No remaining free notes, ad allowance, or credits. Please purchase notes.',
  };
}

/**
 * Safely rolls back / refunds a reserved slot if AI generation fails or times out.
 */
export async function rollbackEntitlement(
  installationId: string,
  entitlement: EntitlementStatus,
  deviceId?: string
): Promise<void> {
  if (entitlement === 'pro' || entitlement === 'paywall') return;

  const user = await getOrCreateUser(installationId, undefined, deviceId);
  const now = new Date().toISOString();
  const targetId = user.installation_id;

  try {
    if (entitlement === 'credit') {
      await client.execute({
        sql: 'UPDATE users SET credits = credits + 1, updated_at = ? WHERE installation_id = ?',
        args: [now, targetId],
      });
      console.log(`[Entitlement] Safely refunded credit to ${targetId}`);
    } else if (entitlement === 'free') {
      await client.execute({
        sql: 'UPDATE users SET free_used = MAX(0, free_used - 1), updated_at = ? WHERE installation_id = ?',
        args: [now, targetId],
      });
      console.log(`[Entitlement] Safely refunded free slot to ${targetId}`);
    } else if (entitlement === 'ad') {
      await client.execute({
        sql: 'UPDATE users SET ad_used = 0, updated_at = ? WHERE installation_id = ?',
        args: [now, targetId],
      });
      console.log(`[Entitlement] Safely refunded ad slot to ${targetId}`);
    }
  } catch (err) {
    console.error(`[Entitlement] Rollback failed for ${targetId}:`, err);
  }
}

export async function consumeUserEntitlement(
  installationId: string,
  entitlement: 'free' | 'ad' | 'credit' | 'pro',
  deviceId?: string
): Promise<boolean> {
  if (entitlement === 'pro') return true;
  const reservation = await reserveEntitlement(installationId, deviceId);
  return reservation.success;
}

/**
 * Records a verified store purchase with idempotency protection against replay attacks.
 */
export async function recordVerifiedPurchase(
  transactionId: string,
  installationId: string,
  packageId: string,
  creditsAmount: number,
  deviceId?: string,
  rcUserId?: string
): Promise<{ success: boolean; alreadyProcessed: boolean; user: UserRecord }> {
  const user = await getOrCreateUser(installationId, rcUserId, deviceId);
  const now = new Date().toISOString();
  const targetId = user.installation_id;

  // 1. Check if transaction already processed
  const existing = await client.execute({
    sql: 'SELECT * FROM processed_purchases WHERE transaction_id = ? LIMIT 1',
    args: [transactionId],
  });

  if (existing.rows.length > 0) {
    console.warn(`[Purchases] Transaction ${transactionId} already processed. Rejecting duplicate.`);
    return { success: true, alreadyProcessed: true, user };
  }

  // 2. Insert into processed_purchases AND atomically increment credits
  try {
    await client.execute({
      sql: `INSERT INTO processed_purchases (transaction_id, installation_id, package_id, credits_added, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [transactionId, targetId, packageId, creditsAmount, now],
    });
  } catch (insertErr: any) {
    if (
      insertErr?.message?.includes('UNIQUE') ||
      insertErr?.message?.includes('constraint') ||
      insertErr?.message?.includes('primary key')
    ) {
      console.warn(`[Purchases] Concurrent duplicate transaction ${transactionId} caught by DB constraint.`);
      return { success: true, alreadyProcessed: true, user };
    }
    throw insertErr;
  }

  await client.execute({
    sql: `UPDATE users 
          SET credits = credits + ?, rc_user_id = COALESCE(?, rc_user_id), updated_at = ? 
          WHERE installation_id = ?`,
    args: [creditsAmount, rcUserId || null, now, targetId],
  });

  const updatedUser = await getOrCreateUser(targetId, undefined, deviceId);
  console.log(`[Purchases] Verified purchase ${transactionId}: added ${creditsAmount} credits to ${targetId}. Balance now: ${updatedUser.credits}`);
  return { success: true, alreadyProcessed: false, user: updatedUser };
}

/**
 * Sets Pro subscription status (e.g. from RevenueCat webhook or verified customer info)
 */
export async function setProStatus(
  installationIdOrRcUserId: string,
  isPro: boolean,
  proExpiresAt?: string | null
): Promise<void> {
  const now = new Date().toISOString();
  const val = isPro ? 1 : 0;
  await client.execute({
    sql: `UPDATE users 
          SET is_pro = ?, pro_expires_at = ?, updated_at = ? 
          WHERE installation_id = ? OR rc_user_id = ?`,
    args: [val, proExpiresAt || null, now, installationIdOrRcUserId, installationIdOrRcUserId],
  });
  console.log(`[Pro] Set is_pro=${val} for ${installationIdOrRcUserId}`);
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

export async function grantAdminCredits(
  targetIdentifier: string,
  amount: number,
  deviceId?: string
): Promise<UserRecord> {
  const clean = targetIdentifier.trim();
  const now = new Date().toISOString();

  // 1. Try finding by account_key (e.g. FIELD-XXXX-YYYY)
  const byKey = await client.execute({
    sql: 'SELECT * FROM users WHERE UPPER(account_key) = UPPER(?) LIMIT 1',
    args: [clean],
  });
  if (byKey.rows.length > 0) {
    const user = mapRowToUser(byKey.rows[0]);
    await client.execute({
      sql: 'UPDATE users SET credits = credits + ?, updated_at = ? WHERE installation_id = ?',
      args: [amount, now, user.installation_id],
    });
    return getOrCreateUser(user.installation_id, undefined, user.device_id || deviceId);
  }

  // 2. Try finding by persistent device_id (e.g. android_xxxx)
  const byDevice = await client.execute({
    sql: 'SELECT * FROM users WHERE device_id = ? LIMIT 1',
    args: [clean],
  });
  if (byDevice.rows.length > 0) {
    const user = mapRowToUser(byDevice.rows[0]);
    await client.execute({
      sql: 'UPDATE users SET credits = credits + ?, updated_at = ? WHERE installation_id = ?',
      args: [amount, now, user.installation_id],
    });
    return getOrCreateUser(user.installation_id, undefined, user.device_id || deviceId);
  }

  // 3. Fallback to installation_id
  return addCreditsToUser(clean, amount, undefined, deviceId);
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

export interface AppEventRecord {
  id?: string;
  installationId: string;
  deviceId?: string | null;
  eventName: string;
  platform?: string;
  appVersion?: string;
  metadata?: Record<string, any> | string;
  createdAt?: string;
}

export async function logAppEvent(event: AppEventRecord): Promise<void> {
  try {
    const id = event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = event.createdAt || new Date().toISOString();
    const metaStr = typeof event.metadata === 'object' ? JSON.stringify(event.metadata) : (event.metadata || '{}');
    const platform = (event.platform || 'unknown').toLowerCase();

    await client.execute({
      sql: `INSERT INTO app_events (id, installation_id, device_id, event_name, platform, app_version, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        event.installationId,
        event.deviceId || null,
        event.eventName,
        platform,
        event.appVersion || null,
        metaStr,
        now,
      ],
    });

    if (event.deviceId) {
      await client.execute({
        sql: `UPDATE users SET updated_at = ? WHERE device_id = ?`,
        args: [now, event.deviceId],
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[Database] Failed to log app event:', err);
  }
}

export async function logBatchAppEvents(events: AppEventRecord[]): Promise<void> {
  if (!events || events.length === 0) return;
  for (const evt of events) {
    await logAppEvent(evt);
  }
}

export interface GroupedIssue {
  code: string;
  category: 'moderation' | 'format' | 'timeout' | 'error';
  title: string;
  description: string;
  count: number;
  affectedDevices: number;
  lastSeen: string;
  sampleError?: string;
}

export interface UserSessionJourney {
  deviceId: string;
  platform: string;
  firstSeen: string;
  lastSeen: string;
  totalEvents: number;
  completedStamp: boolean;
  abandonedScreen?: string;
  notesCreated: number;
  events: Array<{
    eventName: string;
    label: string;
    time: string;
    status: 'cyan' | 'green' | 'amber' | 'red';
    detail: string;
  }>;
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
  ios: {
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
  funnel: {
    appOpens: number;
    composeOpened: number;
    photoSelected: number;
    pressClicked: number;
    pressingStarted: number;
    generatedSuccess: number;
    generatedFailed: number;
    conversionRate: number;
    biggestDropoff: string;
    biggestDropoffPct: number;
    resetAt?: string | null;
  };
  engagement: {
    dau: number;
    wau: number;
    totalSessions: number;
  };
  metrics: {
    activeSessions: number;
    errorRatePct: number;
    avgLatencySec: number;
    funnelConversionPct: number;
  };
  issues: GroupedIssue[];
  userJourneys: UserSessionJourney[];
  topDestinations: Array<{ place: string; count: number }>;
  recentActivity: Array<{
    id: string;
    userId: string;
    place: string;
    number: string;
    status: string;
    costInfo: string | null;
    createdAt: string;
    isDev?: boolean;
  }>;
  recentEvents: Array<{
    id: string;
    installationId: string;
    deviceId: string | null;
    eventName: string;
    platform: string;
    metadata: any;
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

  const devDeviceListSql = KNOWN_DEVELOPER_DEVICES.map(d => `'${d}'`).join(',');

  // Strict filters: Only track data from October 1 onward, and exclude developer test scripts & internal devices
  const testUserFilter = `created_at >= '${LAUNCH_DATE}' 
    AND (is_developer = 0 OR is_developer IS NULL)
    AND (device_id NOT IN (${devDeviceListSql}) OR device_id IS NULL)
    AND (device_id NOT LIKE 'dev_%' OR device_id IS NULL)
    AND (device_id NOT LIKE 'android_dev_%' OR device_id IS NULL)
    AND (device_id NOT LIKE 'ios_dev_%' OR device_id IS NULL)
    AND installation_id NOT LIKE 'test_%' 
    AND installation_id NOT LIKE 'verify_%' 
    AND installation_id != 'prod_verified' 
    AND installation_id NOT LIKE '%probe%'`;

  const testGenFilter = `created_at >= '${LAUNCH_DATE}' 
    AND user_id NOT LIKE 'test_%' 
    AND user_id NOT LIKE 'verify_%' 
    AND user_id NOT LIKE '%probe%'
    AND user_id NOT IN (
      SELECT installation_id FROM users 
      WHERE is_developer = 1 
         OR device_id IN (${devDeviceListSql}) 
         OR device_id LIKE 'dev_%'
         OR device_id LIKE 'android_dev_%'
         OR device_id LIKE 'ios_dev_%'
    )`;

  const testEventFilter = `created_at >= '${LAUNCH_DATE}' 
    AND (device_id NOT IN (${devDeviceListSql}) OR device_id IS NULL)
    AND (device_id NOT LIKE 'dev_%' OR device_id IS NULL)
    AND (device_id NOT LIKE 'android_dev_%' OR device_id IS NULL)
    AND (device_id NOT LIKE 'ios_dev_%' OR device_id IS NULL)
    AND installation_id NOT LIKE 'test_%' 
    AND installation_id NOT LIKE 'verify_%' 
    AND installation_id != 'prod_verified' 
    AND installation_id NOT LIKE '%probe%'`;

  const [
    activeModel,
    funnelResetSetting,
    androidTotalRes,
    androidDayRes,
    androidThreeDayRes,
    androidWeekRes,
    androidActiveRes,
    iosTotalRes,
    iosDayRes,
    iosThreeDayRes,
    iosWeekRes,
    iosActiveRes,
    webTotalRes,
    webDayRes,
    webWeekRes,
    usersTotal,
    genTotal,
    genDay,
    genWeek,
    topPlacesRes,
    recentFeedRes,
    eventsSummaryRes,
    appOpensDayRes,
    appOpensWeekRes,
    eventsFeedRes,
    failedGensGroupRes,
    deepEventsRes,
  ] = await Promise.all([
    getSystemSetting('active_model', 'grok-imagine-image-2.0'),
    getSystemSetting('funnel_reset_at', ''),

    // 1. Android App Devices (Google Play)
    client.execute(`SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND ${testUserFilter}`),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND created_at >= ? AND ${testUserFilter}`, args: [dayAgo] }),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND created_at >= ? AND ${testUserFilter}`, args: [threeDaysAgo] }),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND created_at >= ? AND ${testUserFilter}`, args: [weekAgo] }),
    // Active devices: checked in within the last 48 hours (matches Google Play installed active audience, excluding uninstalls)
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'android_%' AND updated_at >= ? AND ${testUserFilter}`, args: [twoDaysAgo] }),

    // 2. iOS App Devices (Apple App Store)
    client.execute(`SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'ios_%' AND ${testUserFilter}`),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'ios_%' AND created_at >= ? AND ${testUserFilter}`, args: [dayAgo] }),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'ios_%' AND created_at >= ? AND ${testUserFilter}`, args: [threeDaysAgo] }),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'ios_%' AND created_at >= ? AND ${testUserFilter}`, args: [weekAgo] }),
    client.execute({ sql: `SELECT COUNT(DISTINCT device_id) as c FROM users WHERE device_id LIKE 'ios_%' AND updated_at >= ? AND ${testUserFilter}`, args: [twoDaysAgo] }),

    // 3. Web Visitors
    client.execute(`SELECT COUNT(*) as c FROM users WHERE (device_id LIKE 'web_%' OR device_id IS NULL) AND ${testUserFilter}`),
    client.execute({ sql: `SELECT COUNT(*) as c FROM users WHERE (device_id LIKE 'web_%' OR device_id IS NULL) AND created_at >= ? AND ${testUserFilter}`, args: [dayAgo] }),
    client.execute({ sql: `SELECT COUNT(*) as c FROM users WHERE (device_id LIKE 'web_%' OR device_id IS NULL) AND created_at >= ? AND ${testUserFilter}`, args: [weekAgo] }),

    // 4. Monetization totals across all real users
    client.execute(`
      SELECT 
        COUNT(*) as c, 
        SUM(free_used) as free_used, 
        SUM(ad_used) as ads, 
        SUM(credits) as credits, 
        SUM(CASE WHEN credits > 0 THEN 1 ELSE 0 END) as paying 
      FROM users WHERE ${testUserFilter}
    `),

    // 5. Generations (excluding developer test probes)
    client.execute(`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success, 
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed 
      FROM generations WHERE ${testGenFilter}
    `),
    client.execute({ sql: `SELECT COUNT(*) as c FROM generations WHERE created_at >= ? AND ${testGenFilter}`, args: [dayAgo] }),
    client.execute({ sql: `SELECT COUNT(*) as c FROM generations WHERE created_at >= ? AND ${testGenFilter}`, args: [weekAgo] }),

    // 6. Top Places
    client.execute(`
      SELECT place, COUNT(*) as count 
      FROM generations 
      WHERE place IS NOT NULL AND place != '' AND ${testGenFilter} 
      GROUP BY place 
      ORDER BY count DESC 
      LIMIT 8
    `),

    // 7. Recent generations (with is_developer indicator)
    client.execute(`
      SELECT 
        g.id, 
        g.user_id, 
        g.place, 
        g.number, 
        g.status, 
        g.cost_info, 
        g.created_at,
        CASE WHEN (u.is_developer = 1 OR u.device_id IN (${devDeviceListSql}) OR u.device_id LIKE 'dev_%' OR g.user_id LIKE 'test_%') THEN 1 ELSE 0 END as is_dev
      FROM generations g
      LEFT JOIN users u ON g.user_id = u.installation_id
      WHERE g.created_at >= '${LAUNCH_DATE}'
        AND g.user_id NOT LIKE 'test_%' 
        AND g.user_id NOT LIKE 'verify_%' 
        AND g.user_id NOT LIKE '%probe%'
      ORDER BY g.created_at DESC 
      LIMIT 20
    `),

    // 8. Funnel event counts by event name (respects funnel_reset_at if set)
    client.execute(`
      SELECT 
        event_name, 
        COUNT(DISTINCT device_id) as unique_devices,
        COUNT(*) as total_hits
      FROM app_events 
      WHERE ${testEventFilter}
        AND created_at >= COALESCE((SELECT value FROM app_settings WHERE key = 'funnel_reset_at'), '${LAUNCH_DATE}')
      GROUP BY event_name
    `).catch(() => ({ rows: [] })),

    // 9. Active Users (DAU from app_open events in last 24h)
    client.execute({
      sql: `SELECT COUNT(DISTINCT device_id) as c FROM app_events WHERE event_name = 'app_open' AND created_at >= ? AND ${testEventFilter}`,
      args: [dayAgo],
    }).catch(() => ({ rows: [{ c: 0 }] })),

    // 10. Active Users (WAU from app_open events in last 7d)
    client.execute({
      sql: `SELECT COUNT(DISTINCT device_id) as c FROM app_events WHERE event_name = 'app_open' AND created_at >= ? AND ${testEventFilter}`,
      args: [weekAgo],
    }).catch(() => ({ rows: [{ c: 0 }] })),

    // 11. Recent user telemetry events
    client.execute(`
      SELECT 
        id, 
        installation_id, 
        device_id, 
        event_name, 
        platform, 
        metadata, 
        created_at
      FROM app_events
      WHERE ${testEventFilter}
      ORDER BY created_at DESC 
      LIMIT 30
    `).catch(() => ({ rows: [] })),

    // 12. Failed generations grouped for issue diagnostics
    client.execute(`
      SELECT cost_info, COUNT(*) as count, COUNT(DISTINCT user_id) as affected_users, MAX(created_at) as last_seen
      FROM generations
      WHERE status = 'failed' AND ${testGenFilter}
      GROUP BY cost_info
      ORDER BY count DESC
    `).catch(() => ({ rows: [] })),

    // 13. Deep user event stream to reconstruct sessions / journeys
    client.execute(`
      SELECT id, installation_id, device_id, event_name, platform, metadata, created_at
      FROM app_events
      WHERE ${testEventFilter}
      ORDER BY created_at DESC
      LIMIT 160
    `).catch(() => ({ rows: [] })),
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

  const iosTotal = Number(iosTotalRes.rows[0]?.c || 0);
  const iosDay = Number(iosDayRes.rows[0]?.c || 0);
  const ios3d = Number(iosThreeDayRes.rows[0]?.c || 0);
  const iosWeek = Number(iosWeekRes.rows[0]?.c || 0);
  const iosActive = Number(iosActiveRes.rows[0]?.c || 0);

  const webTotal = Number(webTotalRes.rows[0]?.c || 0);
  const webDay = Number(webDayRes.rows[0]?.c || 0);
  const webWeek = Number(webWeekRes.rows[0]?.c || 0);

  // Compute Funnel Metrics
  const eventCounts: Record<string, number> = {};
  const eventHits: Record<string, number> = {};
  for (const r of ((eventsSummaryRes as any)?.rows || [])) {
    const name = String(r.event_name);
    eventCounts[name] = Number(r.unique_devices || 0);
    eventHits[name] = Number(r.total_hits || 0);
  }

  const isFunnelReset = Boolean(funnelResetSetting && funnelResetSetting.trim().length > 0);
  const appOpens = isFunnelReset
    ? (eventCounts['app_open'] || 0)
    : Math.max(eventCounts['app_open'] || 0, androidTotal + iosTotal);
  const composeOpened = eventCounts['compose_opened'] || 0;
  const photoSelected = eventCounts['photo_selected'] || 0;
  const pressClicked = eventCounts['press_clicked'] || 0;
  const pressingStarted = isFunnelReset
    ? (eventCounts['pressing_started'] || 0)
    : Math.max(eventCounts['pressing_started'] || 0, totalGens);
  const generatedSuccess = isFunnelReset
    ? (eventCounts['pressing_success'] || 0)
    : Math.max(eventCounts['pressing_success'] || 0, successGens);
  const generatedFailed = isFunnelReset
    ? (eventCounts['pressing_failed'] || 0)
    : Math.max(eventCounts['pressing_failed'] || 0, Number(gRow.failed || 0));

  // Determine biggest dropoff
  const dropoffSteps = [
    { name: 'Home Screen → Tapped "New Note"', from: appOpens, to: composeOpened },
    { name: 'Compose Screen → Selected Photo', from: composeOpened, to: photoSelected },
    { name: 'Photo Selected → Clicked "Press"', from: photoSelected, to: pressClicked },
    { name: 'Clicked Press → Started Processing', from: pressClicked, to: pressingStarted },
    { name: 'Processing → Successfully Created', from: pressingStarted, to: generatedSuccess },
  ];

  let biggestDropoffName = 'None';
  let biggestDropoffPct = 0;
  for (const step of dropoffSteps) {
    if (step.from > 0) {
      const dropPct = Math.round(((step.from - step.to) / step.from) * 100);
      if (dropPct > biggestDropoffPct && dropPct > 0) {
        biggestDropoffPct = dropPct;
        biggestDropoffName = step.name;
      }
    }
  }

  const conversionRate = appOpens > 0 ? Math.round((generatedSuccess / appOpens) * 100) : 0;
  const dau = Math.max(Number((appOpensDayRes as any)?.rows[0]?.c || 0), androidActive);
  const wau = Math.max(Number((appOpensWeekRes as any)?.rows[0]?.c || 0), androidWeek + iosWeek);
  const totalSessions = Number(eventHits['app_open'] || 0) + androidTotal + iosTotal;

  // Process Grouped Issues
  const rawIssues: GroupedIssue[] = [];
  for (const r of ((failedGensGroupRes as any)?.rows || [])) {
    const rawCost = String(r.cost_info || '');
    let code = 'API_ERROR';
    let category: 'moderation' | 'format' | 'timeout' | 'error' = 'error';
    let title = 'Upstream AI Carving Error';
    let description = 'Carving plate interrupted by upstream AI service.';

    if (rawCost.includes('content-moderated') || rawCost.includes('moderation')) {
      code = 'imagine:content-moderated';
      category = 'moderation';
      title = 'Safety Guardrail Triggered';
      description = 'Image flagged by automated safety guidelines (close-up portrait or branded/cartoon clothing).';
    } else if (rawCost.includes('invalid_image')) {
      code = 'invalid_image:dimensions';
      category = 'format';
      title = 'Image Dimensions / Format Error';
      description = 'Failed to read image dimensions or unsupported format from client upload.';
    } else if (rawCost.includes('timeout') || rawCost.includes('TIMEOUT') || rawCost.includes('504')) {
      code = 'TIMEOUT:upstream';
      category = 'timeout';
      title = 'Plate Carving Timeout';
      description = 'Carving plate exceeded 35s upstream deadline. Automatically rolled back & refunded user.';
    }

    rawIssues.push({
      code,
      category,
      title,
      description,
      count: Number(r.count || 0),
      affectedDevices: Number(r.affected_users || 0),
      lastSeen: String(r.last_seen || ''),
      sampleError: rawCost.slice(0, 160),
    });
  }

  // Process User Journeys
  const deviceGroups = new Map<string, any[]>();
  for (const r of ((deepEventsRes as any)?.rows || [])) {
    const dev = String(r.device_id || r.installation_id || 'unknown');
    if (!deviceGroups.has(dev)) deviceGroups.set(dev, []);
    deviceGroups.get(dev)!.push(r);
  }

  const userJourneys: UserSessionJourney[] = [];
  for (const [devId, evts] of deviceGroups.entries()) {
    evts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let completedStamp = false;
    let notesCreated = 0;

    const mappedEvents = evts.map((e) => {
      let meta: any = {};
      try { meta = JSON.parse(String(e.metadata || '{}')); } catch { meta = e.metadata || {}; }

      let label = 'App Event';
      let status: 'cyan' | 'green' | 'amber' | 'red' = 'cyan';
      let detail = '';

      switch (e.event_name) {
        case 'app_open':
          label = 'App Launched';
          status = 'cyan';
          detail = meta.source ? `source: ${meta.source}` : 'Session started';
          break;
        case 'screen_view':
          label = `Viewed ${meta.screen ? meta.screen.charAt(0).toUpperCase() + meta.screen.slice(1) : 'Screen'}`;
          status = 'cyan';
          detail = `Screen: ${meta.screen || 'unknown'}`;
          break;
        case 'onboarding_modal_shown':
          label = 'Onboarding Prompted';
          status = 'cyan';
          detail = 'First-time welcome carousel';
          break;
        case 'onboarding_completed':
          label = 'Onboarding Completed';
          status = 'green';
          detail = `Completed all slides → ${meta.destination || 'compose'}`;
          break;
        case 'onboarding_skipped':
          label = `Skipped Onboarding (Slide ${meta.exitedAtSlide || 2})`;
          status = 'amber';
          detail = 'Exited carousel before finishing';
          break;
        case 'compose_opened':
          label = 'Opened Compose Desk';
          status = 'cyan';
          detail = 'Tapped New Note (+)';
          break;
        case 'photo_selected':
          label = `Photo Picked (${meta.source || 'Gallery'})`;
          status = 'amber';
          detail = meta.hasExif ? 'EXIF Location verified' : 'Selected from gallery';
          break;
        case 'photo_picker_cancelled':
          label = 'Cancelled Photo Picker';
          status = 'red';
          detail = 'Opened picker but went back without photo';
          break;
        case 'demo_photo_used':
          label = 'Selected Demo Travel Photo';
          status = 'amber';
          detail = 'Used preset sample image';
          break;
        case 'keywords_suggest_clicked':
          label = 'Auto-Detected Keywords';
          status = 'cyan';
          detail = 'Tapped magic wand';
          break;
        case 'press_clicked':
          label = 'Tapped "Press Field Note"';
          status = 'green';
          detail = `Tier: ${meta.entitlement || 'free'}`;
          break;
        case 'pressing_started':
          label = 'Linocut Carving Started';
          status = 'cyan';
          detail = 'Plate carving underway';
          break;
        case 'pressing_success':
          label = '🏆 Note Pressed & Saved';
          status = 'green';
          detail = `Completed in ${meta.elapsedSec || 5}s`;
          completedStamp = true;
          notesCreated++;
          break;
        case 'pressing_failed':
          label = meta.isModeration ? '⚠️ Flagged by Safety Guardrails' : '⚠️ Pressing Failed';
          status = 'red';
          detail = meta.rawError ? String(meta.rawError).slice(0, 80) : 'Error during generation';
          break;
        case 'note_opened':
          label = 'Opened Saved Note';
          status = 'green';
          detail = meta.noteId ? `Note: ${meta.noteId}` : 'Viewing journal card';
          break;
        case 'settings_opened':
          label = 'Opened Settings';
          status = 'cyan';
          detail = 'Settings screen';
          break;
        case 'paywall_shown':
          label = 'Paywall Prompted';
          status = 'amber';
          detail = meta.source ? `Source: ${meta.source}` : 'Store paywall shown';
          break;
        default:
          label = String(e.event_name).replace(/_/g, ' ');
          status = 'cyan';
          detail = '';
      }

      return {
        eventName: String(e.event_name),
        label,
        time: String(e.created_at),
        status,
        detail,
      };
    });

    const lastEvent = evts[evts.length - 1];
    let abandonedScreen: string | undefined;
    if (!completedStamp) {
      const lastMeta = String(lastEvent.metadata || '');
      if (lastEvent.event_name === 'compose_opened' || (lastEvent.event_name === 'screen_view' && lastMeta.includes('compose'))) {
        abandonedScreen = 'Compose Desk (no photo chosen)';
      } else if (lastEvent.event_name === 'photo_picker_cancelled') {
        abandonedScreen = 'Photo Picker (cancelled)';
      } else if (lastEvent.event_name === 'onboarding_skipped' || lastEvent.event_name === 'onboarding_modal_shown') {
        abandonedScreen = 'Onboarding Carousel';
      } else if (lastEvent.event_name === 'paywall_shown') {
        abandonedScreen = 'Paywall Gate';
      } else if (lastEvent.event_name === 'screen_view' && lastMeta.includes('home')) {
        abandonedScreen = 'Home Screen';
      }
    }

    const platform = String(evts[0].platform || (devId.startsWith('android_') ? 'android' : devId.startsWith('ios_') ? 'ios' : 'web'));

    userJourneys.push({
      deviceId: devId,
      platform,
      firstSeen: String(evts[0].created_at),
      lastSeen: String(lastEvent.created_at),
      totalEvents: evts.length,
      completedStamp,
      abandonedScreen,
      notesCreated,
      events: mappedEvents,
    });
  }

  userJourneys.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

  return {
    activeModel: String(activeModel),
    android: {
      total: androidTotal,
      last24h: androidDay,
      last3d: android3d,
      last7d: androidWeek,
      activeDevices: androidActive,
    },
    ios: {
      total: iosTotal,
      last24h: iosDay,
      last3d: ios3d,
      last7d: iosWeek,
      activeDevices: iosActive,
    },
    web: {
      total: webTotal,
      last24h: webDay,
      last7d: webWeek,
    },
    users: {
      total: androidTotal + iosTotal, // Combined mobile store installs
      last24h: androidDay + iosDay,
      last7d: androidWeek + iosWeek,
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
    funnel: {
      appOpens,
      composeOpened,
      photoSelected,
      pressClicked,
      pressingStarted,
      generatedSuccess,
      generatedFailed,
      conversionRate,
      biggestDropoff: biggestDropoffName,
      biggestDropoffPct,
      resetAt: isFunnelReset ? funnelResetSetting : null,
    },
    engagement: {
      dau,
      wau,
      totalSessions,
    },
    metrics: {
      activeSessions: dau || totalSessions,
      errorRatePct: totalGens > 0 ? Number(((Number(gRow.failed || 0) / totalGens) * 100).toFixed(2)) : 0,
      avgLatencySec: 4.8,
      funnelConversionPct: conversionRate,
    },
    issues: rawIssues,
    userJourneys,
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
      isDev: Boolean(Number(r.is_dev || 0)),
    })),
    recentEvents: ((eventsFeedRes as any)?.rows || []).map((r: any) => {
      let meta: any = {};
      try {
        meta = JSON.parse(String(r.metadata || '{}'));
      } catch {
        meta = r.metadata;
      }
      return {
        id: String(r.id),
        installationId: String(r.installation_id),
        deviceId: r.device_id ? String(r.device_id) : null,
        eventName: String(r.event_name),
        platform: String(r.platform || 'unknown'),
        metadata: meta,
        createdAt: String(r.created_at),
      };
    }),
    blogStats: await getBlogStats().catch(() => ({
      totalPosts: 0,
      publishedPosts: 0,
      draftPosts: 0,
      totalViews: 0,
      avgSeoScore: 0,
    })),
  };
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  seo_title: string;
  meta_description: string;
  content_markdown: string;
  content_html: string;
  focus_keywords: string[];
  featured_image_url: string | null;
  featured_image_alt: string | null;
  featured_image_caption: string | null;
  canonical_url: string | null;
  robots: string;
  schema_type: string;
  faq_items: Array<{ question: string; answer: string }>;
  author: string;
  seo_score: number;
  seo_feedback: string[];
  status: 'draft' | 'published';
  view_count: number;
  reading_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export function mapRowToBlogPost(row: any): BlogPost {
  let focusKeywords: string[] = [];
  try {
    focusKeywords = JSON.parse(row.focus_keywords || '[]');
  } catch {
    focusKeywords = row.focus_keywords ? [String(row.focus_keywords)] : [];
  }

  let faqItems: Array<{ question: string; answer: string }> = [];
  try {
    faqItems = JSON.parse(row.faq_items || '[]');
  } catch {
    faqItems = [];
  }

  let seoFeedback: string[] = [];
  try {
    seoFeedback = JSON.parse(row.seo_feedback || '[]');
  } catch {
    seoFeedback = [];
  }

  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    seo_title: String(row.seo_title || row.title),
    meta_description: String(row.meta_description || ''),
    content_markdown: String(row.content_markdown || ''),
    content_html: String(row.content_html || ''),
    focus_keywords: focusKeywords,
    featured_image_url: row.featured_image_url ? String(row.featured_image_url) : null,
    featured_image_alt: row.featured_image_alt ? String(row.featured_image_alt) : null,
    featured_image_caption: row.featured_image_caption ? String(row.featured_image_caption) : null,
    canonical_url: row.canonical_url ? String(row.canonical_url) : null,
    robots: String(row.robots || 'index, follow'),
    schema_type: String(row.schema_type || 'Article'),
    faq_items: faqItems,
    author: String(row.author || 'Fields Editorial'),
    seo_score: Number(row.seo_score || 0),
    seo_feedback: seoFeedback,
    status: (row.status === 'draft' ? 'draft' : 'published') as 'draft' | 'published',
    view_count: Number(row.view_count || 0),
    reading_time_minutes: Number(row.reading_time_minutes || 3),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  };
}

export async function createOrUpdateBlogPost(post: Partial<BlogPost> & { title: string; content_markdown: string }): Promise<BlogPost> {
  const now = new Date().toISOString();
  const slug = post.slug || post.title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  const id = post.id || `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const wordCount = post.content_markdown.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const existingRes = await client.execute({
    sql: 'SELECT id, created_at, view_count FROM blog_posts WHERE slug = ? LIMIT 1',
    args: [slug],
  });

  const existing = existingRes.rows[0];
  const finalId = existing ? String(existing.id) : id;
  const createdAt = existing ? String(existing.created_at) : now;
  const viewCount = existing ? Number(existing.view_count || 0) : 0;

  const focusKeywordsJson = JSON.stringify(post.focus_keywords || []);
  const faqItemsJson = JSON.stringify(post.faq_items || []);
  const seoFeedbackJson = JSON.stringify(post.seo_feedback || []);

  await client.execute({
    sql: `
      INSERT INTO blog_posts (
        id, slug, title, seo_title, meta_description,
        content_markdown, content_html, focus_keywords,
        featured_image_url, featured_image_alt, featured_image_caption,
        canonical_url, robots, schema_type, faq_items,
        author, seo_score, seo_feedback, status, view_count,
        reading_time_minutes, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title,
        seo_title = excluded.seo_title,
        meta_description = excluded.meta_description,
        content_markdown = excluded.content_markdown,
        content_html = excluded.content_html,
        focus_keywords = excluded.focus_keywords,
        featured_image_url = excluded.featured_image_url,
        featured_image_alt = excluded.featured_image_alt,
        featured_image_caption = excluded.featured_image_caption,
        canonical_url = excluded.canonical_url,
        robots = excluded.robots,
        schema_type = excluded.schema_type,
        faq_items = excluded.faq_items,
        author = excluded.author,
        seo_score = excluded.seo_score,
        seo_feedback = excluded.seo_feedback,
        status = excluded.status,
        reading_time_minutes = excluded.reading_time_minutes,
        updated_at = excluded.updated_at;
    `,
    args: [
      finalId,
      slug,
      post.title,
      post.seo_title || post.title,
      post.meta_description || '',
      post.content_markdown,
      post.content_html || '',
      focusKeywordsJson,
      post.featured_image_url || null,
      post.featured_image_alt || null,
      post.featured_image_caption || null,
      post.canonical_url || `https://travel-scrapbook.com/blog/${slug}`,
      post.robots || 'index, follow',
      post.schema_type || 'Article',
      faqItemsJson,
      post.author || 'Fields Editorial',
      post.seo_score || 0,
      seoFeedbackJson,
      post.status || 'published',
      viewCount,
      readingTime,
      createdAt,
      now,
    ],
  });

  const saved = await getBlogPostBySlug(slug);
  if (!saved) throw new Error('Failed to retrieve saved blog post');
  return saved;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const res = await client.execute({
    sql: 'SELECT * FROM blog_posts WHERE slug = ? LIMIT 1',
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return mapRowToBlogPost(res.rows[0]);
}

export async function getBlogPost(slugOrId: string): Promise<BlogPost | null> {
  const res = await client.execute({
    sql: 'SELECT * FROM blog_posts WHERE slug = ? OR id = ? LIMIT 1',
    args: [slugOrId, slugOrId],
  });
  if (res.rows.length === 0) return null;
  return mapRowToBlogPost(res.rows[0]);
}

export async function updateBlogPost(
  slugOrId: string,
  updates: Partial<BlogPost>
): Promise<BlogPost | null> {
  const existing = await getBlogPost(slugOrId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const newTitle = updates.title !== undefined ? updates.title.trim() : existing.title;
  const newMarkdown = updates.content_markdown !== undefined ? updates.content_markdown : existing.content_markdown;
  const newHtml = updates.content_html !== undefined ? updates.content_html : existing.content_html;
  const newSlug = updates.slug !== undefined ? updates.slug : existing.slug;

  const wordCount = newMarkdown.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const focusKeywords = updates.focus_keywords !== undefined ? updates.focus_keywords : existing.focus_keywords;
  const faqItems = updates.faq_items !== undefined ? updates.faq_items : existing.faq_items;
  const seoFeedback = updates.seo_feedback !== undefined ? updates.seo_feedback : existing.seo_feedback;

  const featuredImageUrl = updates.featured_image_url !== undefined ? updates.featured_image_url : existing.featured_image_url;
  const featuredImageAlt = updates.featured_image_alt !== undefined ? updates.featured_image_alt : existing.featured_image_alt;
  const featuredImageCaption = updates.featured_image_caption !== undefined ? updates.featured_image_caption : existing.featured_image_caption;

  const seoTitle = updates.seo_title !== undefined ? updates.seo_title.trim() : existing.seo_title;
  const metaDescription = updates.meta_description !== undefined ? updates.meta_description.trim() : existing.meta_description;
  const canonicalUrl = updates.canonical_url !== undefined ? updates.canonical_url : existing.canonical_url;
  const robots = updates.robots !== undefined ? updates.robots : existing.robots;
  const schemaType = updates.schema_type !== undefined ? updates.schema_type : existing.schema_type;
  const author = updates.author !== undefined ? updates.author : existing.author;
  const seoScore = updates.seo_score !== undefined ? updates.seo_score : existing.seo_score;
  const status = updates.status !== undefined ? updates.status : existing.status;

  await client.execute({
    sql: `
      UPDATE blog_posts SET
        slug = ?,
        title = ?,
        seo_title = ?,
        meta_description = ?,
        content_markdown = ?,
        content_html = ?,
        focus_keywords = ?,
        featured_image_url = ?,
        featured_image_alt = ?,
        featured_image_caption = ?,
        canonical_url = ?,
        robots = ?,
        schema_type = ?,
        faq_items = ?,
        author = ?,
        seo_score = ?,
        seo_feedback = ?,
        status = ?,
        reading_time_minutes = ?,
        updated_at = ?
      WHERE id = ?
    `,
    args: [
      newSlug,
      newTitle,
      seoTitle,
      metaDescription,
      newMarkdown,
      newHtml,
      JSON.stringify(focusKeywords),
      featuredImageUrl,
      featuredImageAlt,
      featuredImageCaption,
      canonicalUrl,
      robots,
      schemaType,
      JSON.stringify(faqItems),
      author,
      seoScore,
      JSON.stringify(seoFeedback),
      status,
      readingTime,
      now,
      existing.id,
    ],
  });

  return await getBlogPost(existing.id);
}

export async function listBlogPosts(options: { status?: 'all' | 'published' | 'draft'; limit?: number; offset?: number } = {}): Promise<BlogPost[]> {
  const { status = 'all', limit = 50, offset = 0 } = options;
  let sql = 'SELECT * FROM blog_posts';
  const args: any[] = [];

  if (status !== 'all') {
    sql += ' WHERE status = ?';
    args.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const res = await client.execute({ sql, args });
  return res.rows.map(mapRowToBlogPost);
}

export async function deleteBlogPost(slugOrId: string): Promise<boolean> {
  const res = await client.execute({
    sql: 'DELETE FROM blog_posts WHERE slug = ? OR id = ?',
    args: [slugOrId, slugOrId],
  });
  return (res.rowsAffected || 0) > 0;
}

export async function incrementBlogPostViews(slug: string): Promise<void> {
  try {
    await client.execute({
      sql: 'UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = ?',
      args: [slug],
    });
  } catch {
    // Non-fatal
  }
}

export async function getInternalLinkTargets(): Promise<{
  conversionAnchors: Array<{ label: string; url: string; recommendedAnchors: string[] }>;
  existingArticles: Array<{ title: string; slug: string; url: string; keywords: string[] }>;
}> {
  const posts = await listBlogPosts({ status: 'published', limit: 25 });
  return {
    conversionAnchors: [
      {
        label: 'Travel Scrapbook Web App',
        url: 'https://travel-scrapbook.com/app',
        recommendedAnchors: [
          'create a digital travel scrapbook',
          'turn photos into vintage stamps',
          'try the travel scrapbook app',
          'make a custom travel stamp'
        ],
      },
      {
        label: 'Fields Homepage',
        url: 'https://travel-scrapbook.com/',
        recommendedAnchors: [
          'Fields travel journal',
          'digital travel scrapbook',
          'vintage travel scrapbook app'
        ],
      },
      {
        label: 'Pro Pricing & Lifetime Edition',
        url: 'https://travel-scrapbook.com/#pricing',
        recommendedAnchors: [
          'Fields Pro lifetime access',
          'unlimited travel scrapbooks',
          'high-resolution print export'
        ],
      },
    ],
    existingArticles: posts.map(p => ({
      title: p.title,
      slug: p.slug,
      url: `https://travel-scrapbook.com/blog/${p.slug}`,
      keywords: p.focus_keywords || [],
    })),
  };
}

export async function getBlogStats(): Promise<{
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  avgSeoScore: number;
}> {
  const res = await client.execute(`
    SELECT 
      COUNT(*) as total_posts,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_posts,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_posts,
      COALESCE(SUM(view_count), 0) as total_views,
      COALESCE(AVG(seo_score), 0) as avg_seo_score
    FROM blog_posts;
  `);

  const row = res.rows[0];
  return {
    totalPosts: Number(row?.total_posts || 0),
    publishedPosts: Number(row?.published_posts || 0),
    draftPosts: Number(row?.draft_posts || 0),
    totalViews: Number(row?.total_views || 0),
    avgSeoScore: Math.round(Number(row?.avg_seo_score || 0)),
  };
}

