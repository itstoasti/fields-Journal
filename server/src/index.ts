import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import dotenv from 'dotenv';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  getOrCreateUser,
  determineEntitlement,
  reserveEntitlement,
  rollbackEntitlement,
  recordVerifiedPurchase,
  setProStatus,
  grantAdminCredits,
  isDeveloperDevice,
  linkAccountByKey,
  deleteUserAccount,
  logContentReport,
  logGenerationRecord,
  getAdminStats,
  getSystemSetting,
  setSystemSetting,
} from './db.js';
import { buildGrokPrompt } from './prompt.js';
import { generateFieldNoteImage } from './grok.js';
import { generateGeminiImage } from './gemini.js';
import { suggestMemoryKeywords } from './keywords.js';
import { renderAdminDashboardHtml } from './adminHtml.js';

dotenv.config();

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'ngrok-skip-browser-warning'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));

// Helper to resolve public files whether server is run from repo root or server/ dir
function findPublicFile(...subpaths: string[]): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'server', 'public', ...subpaths),
    path.resolve(process.cwd(), 'public', ...subpaths),
    path.resolve(process.cwd(), '..', 'public', ...subpaths),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// Public Landing Page
app.get('/', (c) => {
  const filePath = findPublicFile('index.html');
  if (filePath) {
    return c.html(fs.readFileSync(filePath, 'utf-8'));
  }
  return c.text('FIELDS Website', 200);
});

// Favicon Routes
app.get('/favicon.ico', (c) => {
  const filePath = findPublicFile('favicon.ico');
  if (filePath) {
    return c.body(fs.readFileSync(filePath), 200, {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400',
    });
  }
  return c.text('Not found', 404);
});

app.get('/favicon.png', (c) => {
  const filePath = findPublicFile('favicon.png');
  if (filePath) {
    return c.body(fs.readFileSync(filePath), 200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    });
  }
  return c.text('Not found', 404);
});

// Static Assets (/assets/:filename)
app.get('/assets/:filename', (c) => {
  const filename = c.req.param('filename');
  const filePath = findPublicFile('assets', filename);
  if (filePath) {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';
    const fileBuf = fs.readFileSync(filePath);
    return c.body(fileBuf, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    });
  }
  return c.text('Asset not found', 404);
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'fields-api',
    timestamp: new Date().toISOString(),
  });
});

// Public Privacy Policy & Terms of Service for Store Compliance
app.get('/privacy', (c) => {
  const filePath = findPublicFile('privacy.html');
  if (filePath) {
    return c.html(fs.readFileSync(filePath, 'utf-8'));
  }
  return c.text('Privacy Policy not found', 404);
});

app.get('/terms', (c) => {
  const filePath = findPublicFile('terms.html');
  if (filePath) {
    return c.html(fs.readFileSync(filePath, 'utf-8'));
  }
  return c.text('Terms of Service not found', 404);
});

// Admin auth verification helper with timing-safe comparison
function verifyAdminAuth(c: any): boolean {
  const configuredAdminPin = process.env.ADMIN_PIN || process.env.ADMIN_KEY || 'fields_sec_adm_2026_x89a1c';
  if (!configuredAdminPin) return false;
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const queryKey = c.req.query('key');
  const provided = token || queryKey;
  if (!provided) return false;
  try {
    const bufA = Buffer.from(provided);
    const bufB = Buffer.from(configuredAdminPin);
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return provided === configuredAdminPin;
  }
}

// Admin Telemetry Dashboard (Mobile Web)
app.get('/admin', (c) => {
  return c.html(renderAdminDashboardHtml());
});

// Admin Telemetry Stats API
app.get('/v1/admin/stats', async (c) => {
  if (!verifyAdminAuth(c)) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid admin PIN' }, 401);
  }

  try {
    const stats = await getAdminStats();
    return c.json(stats);
  } catch (err: any) {
    return c.json({ error: 'STATS_ERROR', message: err.message }, 500);
  }
});

// Update System Settings (Active Model, etc.)
app.post('/v1/admin/settings', async (c) => {
  if (!verifyAdminAuth(c)) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid admin PIN' }, 401);
  }

  try {
    const body = await c.req.json();
    const { key, value } = body;
    if (!key || !value) {
      return c.json({ error: 'BAD_REQUEST', message: 'key and value are required' }, 400);
    }

    await setSystemSetting(key, String(value));
    return c.json({ success: true, key, value });
  } catch (err: any) {
    return c.json({ error: 'SETTINGS_ERROR', message: err.message }, 500);
  }
});

// Developer Admin: Grant test credits safely with Admin PIN
app.post('/v1/admin/credits', async (c) => {
  if (!verifyAdminAuth(c)) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid admin PIN' }, 401);
  }
  try {
    const body = await c.req.json();
    const { target, installationId, accountKey, deviceId, amount = 20 } = body;
    const identifier = target || accountKey || installationId || deviceId;
    if (!identifier) {
      return c.json({ error: 'MISSING_IDENTIFIER', message: 'accountKey, installationId, or deviceId is required' }, 400);
    }
    const updatedUser = await grantAdminCredits(identifier, Number(amount) || 20, deviceId);
    return c.json({
      success: true,
      installationId: updatedUser.installation_id,
      accountKey: updatedUser.account_key,
      deviceId: updatedUser.device_id,
      credits: updatedUser.credits,
    });
  } catch (err: any) {
    return c.json({ error: 'ADMIN_CREDIT_ERROR', message: err.message }, 500);
  }
});

// Webhook for verified store purchases & cancellations from RevenueCat
app.post('/v1/webhooks/revenuecat', async (c) => {
  const whSecret = process.env.REVENUECAT_WEBHOOK_SECRET || process.env.ADMIN_PIN || 'rc_wh_sec_f9814c81a90b4d6e927c';
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!whSecret || token !== whSecret) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid webhook authorization' }, 401);
  }

  try {
    const body = await c.req.json();
    const event = body.event || body;
    const { type, app_user_id, product_id, transaction_id, id } = event;
    const txId = transaction_id || id || `rc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    console.log(`[RevenueCat Webhook] Event ${type} for user=${app_user_id}, product=${product_id}, tx=${txId}`);

    if (type === 'NON_RENEWING_PURCHASE') {
      const creditsToAdd = product_id === 'notes_20' ? 20 : 20;
      await recordVerifiedPurchase(txId, app_user_id, product_id || 'notes_20', creditsToAdd);
    } else if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
      const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
      await setProStatus(app_user_id, true, expiresAt);
    } else if (type === 'CANCELLATION' || type === 'EXPIRATION' || type === 'REVOCATION') {
      await setProStatus(app_user_id, false, null);
    }

    return c.json({ success: true, processed: true });
  } catch (err: any) {
    console.error('[RevenueCat Webhook] Error:', err);
    return c.json({ error: 'WEBHOOK_ERROR', message: err.message }, 500);
  }
});

// User profile & entitlements
app.get('/v1/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const queryId = c.req.query('installationId');
  const deviceId = c.req.query('deviceId');
  const installationId = token || queryId;

  if (!installationId) {
    return c.json({ error: 'MISSING_INSTALLATION_ID', message: 'installationId is required' }, 400);
  }

  const user = await getOrCreateUser(installationId, undefined, deviceId);
  const entitlement = determineEntitlement(user);

  return c.json({
    installationId: user.installation_id,
    deviceId: user.device_id,
    rcUserId: user.rc_user_id,
    accountKey: user.account_key,
    freeUsed: user.free_used,
    adUsed: Boolean(user.ad_used),
    credits: user.credits,
    isPro: Boolean(user.is_pro),
    entitlement,
  });
});

// Sync credits after verified RevenueCat purchase
app.post('/v1/credits/sync', async (c) => {
  try {
    const body = await c.req.json();
    const { installationId, deviceId, rcUserId, packageId = 'notes_20', creditsToAdd = 20, transactionId } = body;

    if (!installationId) {
      return c.json({ error: 'MISSING_INSTALLATION_ID', message: 'installationId is required' }, 400);
    }

    const parsedCredits = Math.floor(Number(creditsToAdd));
    if (isNaN(parsedCredits) || parsedCredits <= 0 || parsedCredits > 100) {
      return c.json({ error: 'INVALID_CREDIT_AMOUNT', message: 'creditsToAdd must be a positive integer between 1 and 100' }, 400);
    }

    const isAdmin = verifyAdminAuth(c);
    const isDev = isDeveloperDevice(deviceId, installationId);

    // 1. If real store transactionId is supplied, record with replay idempotency
    if (transactionId && typeof transactionId === 'string' && transactionId.trim().length > 0) {
      const result = await recordVerifiedPurchase(
        transactionId.trim(),
        installationId,
        packageId,
        parsedCredits,
        deviceId,
        rcUserId
      );
      const entitlement = determineEntitlement(result.user);

      return c.json({
        success: true,
        accountKey: result.user.account_key,
        freeUsed: result.user.free_used,
        adUsed: Boolean(result.user.ad_used),
        credits: result.user.credits,
        isPro: Boolean(result.user.is_pro),
        entitlement,
      });
    }

    // 2. Unverified client sync attempt: only allowed for authenticated admin or verified developer devices
    if (!isAdmin && !isDev) {
      return c.json({
        error: 'VERIFICATION_REQUIRED',
        message: 'A valid store transactionId or RevenueCat verification is required to add credits.',
      }, 403);
    }

    // Admin / Developer test sync
    const updatedUser = await grantAdminCredits(installationId, parsedCredits, deviceId);
    const entitlement = determineEntitlement(updatedUser);

    return c.json({
      success: true,
      accountKey: updatedUser.account_key,
      freeUsed: updatedUser.free_used,
      adUsed: Boolean(updatedUser.ad_used),
      credits: updatedUser.credits,
      isPro: Boolean(updatedUser.is_pro),
      entitlement,
    });
  } catch (err: any) {
    return c.json({ error: 'SYNC_ERROR', message: err.message }, 500);
  }
});

// In-memory rate limiter for account linking attempts (max 5 failed attempts per 15 minutes per IP)
const accountLinkRateLimitMap = new Map<string, { attempts: number; resetAt: number }>();

// Link existing account via Account Key (e.g. FIELD-XXXX-YYYY)
app.post('/v1/account/link', async (c) => {
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0].trim() || c.req.header('x-real-ip') || 'unknown';
  let installationId = '';
  try {
    const body = await c.req.json();
    installationId = body.installationId || '';
    const { accountKey, deviceId } = body;
    const rateLimitKey = `${clientIp}_${installationId}`;
    const now = Date.now();
    const limiter = accountLinkRateLimitMap.get(rateLimitKey);

    if (limiter && now < limiter.resetAt && limiter.attempts >= 5) {
      return c.json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many account link attempts. Please wait 15 minutes before trying again.',
      }, 429);
    }

    if (!accountKey || typeof accountKey !== 'string') {
      return c.json({ error: 'MISSING_ACCOUNT_KEY', message: 'Account key is required' }, 400);
    }

    if (!installationId) {
      return c.json({ error: 'MISSING_INSTALLATION_ID', message: 'installationId is required' }, 400);
    }

    const linkedUser = await linkAccountByKey(installationId, accountKey, deviceId);
    const entitlement = determineEntitlement(linkedUser);

    accountLinkRateLimitMap.delete(rateLimitKey);

    console.log(`[Account Link] Linked install ${installationId} -> account ${linkedUser.account_key} (credits: ${linkedUser.credits})`);

    return c.json({
      success: true,
      installationId: linkedUser.installation_id,
      accountKey: linkedUser.account_key,
      deviceId: linkedUser.device_id,
      rcUserId: linkedUser.rc_user_id,
      freeUsed: linkedUser.free_used,
      adUsed: Boolean(linkedUser.ad_used),
      credits: linkedUser.credits,
      entitlement,
    });
  } catch (err: any) {
    const rateLimitKey = `${clientIp}_${installationId}`;
    const now = Date.now();
    const current = accountLinkRateLimitMap.get(rateLimitKey);
    if (!current || now > current.resetAt) {
      accountLinkRateLimitMap.set(rateLimitKey, { attempts: 1, resetAt: now + 15 * 60 * 1000 });
    } else {
      current.attempts += 1;
    }
    console.error('[Account Link] Error:', err);
    return c.json({ error: 'LINK_ERROR', message: err.message || 'Failed to link account key.' }, 400);
  }
});

// User-Initiated Account & Data Deletion (Apple App Store Guideline 5.1.1(v) Compliance)
app.post('/v1/account/delete', async (c) => {
  try {
    const body = await c.req.json();
    const { installationId, accountKey } = body;
    if (!installationId) {
      return c.json({ error: 'MISSING_INSTALLATION_ID', message: 'installationId is required' }, 400);
    }
    await deleteUserAccount(installationId, accountKey);
    console.log(`[Account Delete] Permanently deleted account for installation=${installationId}, key=${accountKey || 'none'}`);
    return c.json({ success: true, message: 'Account and associated server records permanently deleted.' });
  } catch (err: any) {
    console.error('[Account Delete] Error:', err);
    return c.json({ error: 'DELETE_ERROR', message: err.message || 'Failed to delete account.' }, 500);
  }
});

// User Report / Moderation of Inappropriate Output (Apple App Store Guideline 1.2 Compliance)
app.post('/v1/report', async (c) => {
  try {
    const body = await c.req.json();
    const { installationId, reason, noteMetadata } = body;
    await logContentReport(installationId || 'anonymous', reason || 'inappropriate_output', noteMetadata);
    console.log(`[Content Report] Flagged output report received from installation=${installationId}: ${reason || 'unspecified'}`);
    return c.json({ success: true, message: 'Report received and queued for review.' });
  } catch (err: any) {
    console.error('[Content Report] Error:', err);
    return c.json({ error: 'REPORT_ERROR', message: err.message || 'Failed to log report.' }, 500);
  }
});

// In-memory sliding rate limiter for keywords suggestions (max 30 req per 10 min per installation)
const keywordRateLimitMap = new Map<string, { count: number; resetAt: number }>();

// In-memory rate limiter for free/starter note generation per IP (max 6 free generations per 24 hours per IP)
const freeGenerationIpMap = new Map<string, { count: number; resetAt: number }>();

// Generate Field Note Poster
app.post('/v1/notes', async (c) => {
  const noteId = `fn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let installationId = '';
  let deviceId: string | undefined;

  try {
    const contentType = c.req.header('Content-Type') || '';
    let imageBuffer: Buffer;
    let mimeType = 'image/jpeg';
    let place = '';
    let number = '01';
    let keywords: string[] = [];
    let year = '';
    let rcUserId: string | undefined;
    let model: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      installationId = (body['installationId'] as string) || '';
      deviceId = (body['deviceId'] as string) || undefined;
      rcUserId = (body['rcUserId'] as string) || undefined;
      place = (body['place'] as string) || '';
      number = (body['number'] as string) || '01';
      year = (body['year'] as string) || '';
      model = (body['model'] as string) || undefined;

      const kwRaw = body['keywords'];
      if (typeof kwRaw === 'string') {
        try {
          keywords = JSON.parse(kwRaw);
        } catch {
          keywords = kwRaw.split(',').map((s) => s.trim());
        }
      }

      const file = body['image'];
      if (file instanceof File) {
        const arrayBuf = await file.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
        mimeType = file.type || 'image/jpeg';
      } else {
        return c.json({ error: 'MISSING_IMAGE', message: 'Valid image file is required' }, 400);
      }
    } else {
      // JSON format with base64 image
      const body = await c.req.json();
      installationId = body.installationId || '';
      deviceId = body.deviceId || undefined;
      rcUserId = body.rcUserId;
      place = body.place || '';
      number = body.number || '01';
      const kwRaw = body.keywords;
      if (Array.isArray(kwRaw)) {
        keywords = kwRaw.map((k: any) => String(k).trim());
      } else if (typeof kwRaw === 'string') {
        try {
          const parsed = JSON.parse(kwRaw);
          keywords = Array.isArray(parsed) ? parsed.map((s: any) => String(s).trim()) : kwRaw.split(/[·,\n|]/).map((s: string) => s.trim());
        } catch {
          keywords = kwRaw.split(/[·,\n|]/).map((s: string) => s.trim());
        }
      } else {
        keywords = [];
      }
      year = body.year || '';
      model = body.model || undefined;

      if (!body.imageBase64) {
        return c.json({ error: 'MISSING_IMAGE', message: 'imageBase64 is required' }, 400);
      }

      imageBuffer = Buffer.from(body.imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      mimeType = body.mimeType || 'image/jpeg';
    }

    if (!installationId) {
      const authHeader = c.req.header('Authorization');
      installationId = authHeader?.replace('Bearer ', '').trim() || '';
    }

    if (!installationId) {
      return c.json({ error: 'MISSING_INSTALLATION_ID', message: 'installationId is required' }, 400);
    }

    // Security: Require persistent deviceId for abuse prevention
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length < 6 || deviceId.length > 128) {
      return c.json({ error: 'MISSING_DEVICE_ID', message: 'Valid persistent deviceId is required.' }, 400);
    }

    // Step 1: Atomically Reserve Entitlement in Database BEFORE Calling Model
    // (Eliminates TOCTOU race conditions and rejects client-side entitlement spoofing)
    const reservation = await reserveEntitlement(installationId, deviceId, rcUserId);

    if (!reservation.success) {
      return c.json({
        error: 'PAYWALL_REQUIRED',
        message: reservation.error || 'No remaining free notes, ad allowance, or credits. Please purchase notes.',
        userState: {
          freeUsed: reservation.user.free_used,
          adUsed: Boolean(reservation.user.ad_used),
          credits: reservation.user.credits,
          isPro: Boolean(reservation.user.is_pro),
          entitlement: 'paywall',
        },
      }, 402);
    }

    const effectiveEntitlement = reservation.entitlement;

    // Step 1b: Anti-Sybil Rate Limiting for Free Starter Notes per Network IP
    // Blocks automated scripts rotating device IDs to drain free AI model quota
    const clientIp = c.req.header('x-forwarded-for')?.split(',')[0].trim() || c.req.header('x-real-ip') || 'unknown';
    const isFreeTier = effectiveEntitlement === 'free' || effectiveEntitlement === 'ad';
    if (isFreeTier && clientIp !== 'unknown' && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      const now = Date.now();
      const ipRecord = freeGenerationIpMap.get(clientIp);
      if (ipRecord && now < ipRecord.resetAt && ipRecord.count >= 6) {
        // Rollback reserved free entitlement slot
        await rollbackEntitlement(installationId, effectiveEntitlement, deviceId);
        return c.json({
          error: 'FREE_LIMIT_REACHED',
          message: 'Free note limit reached for this network. Please purchase a note pack or upgrade to Pro to continue.',
          userState: {
            freeUsed: reservation.user.free_used - (effectiveEntitlement === 'free' ? 1 : 0),
            adUsed: effectiveEntitlement === 'ad' ? false : Boolean(reservation.user.ad_used),
            credits: reservation.user.credits,
            isPro: Boolean(reservation.user.is_pro),
            entitlement: 'paywall',
          },
        }, 429);
      }
      if (!ipRecord || now > ipRecord.resetAt) {
        freeGenerationIpMap.set(clientIp, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
      } else {
        ipRecord.count += 1;
      }
    }

    // Step 2: Build server-owned locked prompt
    const prompt = buildGrokPrompt({
      place,
      number,
      keywords,
      year,
    });

    // Server-controlled active model overrides client setting
    const serverActiveModel = await getSystemSetting('active_model', 'grok-imagine-image-2.0');
    const effectiveModel = serverActiveModel || model || 'grok-imagine-image-2.0';

    console.log(`[Notes] Generating note ${noteId} for ${installationId} under reserved "${effectiveEntitlement}" with model ${effectiveModel}...`);

    // Step 3: Execute Image generation (Gemini or Grok Imagine)
    const isGeminiModel = effectiveModel?.toLowerCase().startsWith('gemini');
    let result;
    try {
      if (isGeminiModel) {
        try {
          result = await generateGeminiImage({
            imageBuffer,
            mimeType,
            prompt,
            model: effectiveModel,
          });
        } catch (geminiErr: any) {
          console.warn(`[Notes] Gemini model ${effectiveModel} failed (${geminiErr.message}). Falling back to Grok Imagine 2.0...`);
          result = await generateFieldNoteImage({
            imageBuffer,
            mimeType,
            prompt,
            model: 'grok-imagine-image-2.0',
          });
        }
      } else {
        result = await generateFieldNoteImage({
          imageBuffer,
          mimeType,
          prompt,
          model: effectiveModel,
        });
      }
    } catch (genErr: any) {
      // Model call failed: safely rollback / refund the reserved entitlement so user is not charged
      await rollbackEntitlement(installationId, effectiveEntitlement, deviceId);
      throw genErr;
    }

    // Step 4: Log anonymous generation record
    await logGenerationRecord(noteId, installationId, place, number, 'success', result.modelUsed);

    const updatedUser = await getOrCreateUser(installationId, undefined, deviceId);

    return c.json({
      success: true,
      noteId,
      imageBase64: result.imageBase64,
      imageUrl: result.imageUrl,
      modelUsed: result.modelUsed,
      userState: {
        freeUsed: updatedUser.free_used,
        adUsed: Boolean(updatedUser.ad_used),
        credits: updatedUser.credits,
        isPro: Boolean(updatedUser.is_pro),
        entitlement: determineEntitlement(updatedUser),
      },
    });
  } catch (err: any) {
    console.error(`[Notes] Generation error: ${err.message}`);
    await logGenerationRecord(noteId, installationId, '', '', 'failed', err.message);

    const user = await getOrCreateUser(installationId, undefined, deviceId);

    return c.json({
      error: 'GENERATION_FAILED',
      message: err.message || 'An error occurred during field note generation.',
      userState: {
        freeUsed: user.free_used,
        adUsed: Boolean(user.ad_used),
        credits: user.credits,
        isPro: Boolean(user.is_pro),
        entitlement: determineEntitlement(user),
      },
    }, 500);
  }
});

/**
 * POST /v1/keywords/suggest
 * Analyzes photo + location to generate 3 evocative, sensory memory keywords
 */
app.post('/v1/keywords/suggest', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    const queryId = c.req.query('installationId');
    const installationId = token || queryId;

    // Rate limiting: max 30 keyword requests per 10 minutes per installation
    if (installationId) {
      const now = Date.now();
      const current = keywordRateLimitMap.get(installationId);
      if (!current || now > current.resetAt) {
        keywordRateLimitMap.set(installationId, { count: 1, resetAt: now + 10 * 60 * 1000 });
      } else {
        if (current.count >= 30) {
          return c.json({ error: 'RATE_LIMIT_EXCEEDED', message: 'Too many keyword suggestions. Please wait a few minutes.' }, 429);
        }
        current.count += 1;
      }
    }

    const contentType = c.req.header('Content-Type') || '';
    let imageBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let location = '';

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      location = (body.location as string) || '';

      const photoFile = body.photo;
      if (photoFile && typeof photoFile === 'object' && 'arrayBuffer' in photoFile) {
        const ab = await (photoFile as any).arrayBuffer();
        imageBuffer = Buffer.from(ab);
        mimeType = (photoFile as any).type || 'image/jpeg';
      }
    } else {
      const body = await c.req.json();
      location = body.location || '';
      if (body.imageBase64) {
        imageBuffer = Buffer.from(body.imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        mimeType = body.mimeType || 'image/jpeg';
      }
    }

    if (!imageBuffer) {
      return c.json({ error: 'MISSING_IMAGE', message: 'Image is required for keyword suggestion' }, 400);
    }

    console.log(`[Keywords] Suggesting keywords for location: "${location || 'unknown'}"...`);
    const result = await suggestMemoryKeywords({
      imageBuffer,
      mimeType,
      location,
    });

    console.log(`[Keywords] Generated keywords: [${result.keywords.join(', ')}] via ${result.source}`);

    return c.json({
      success: true,
      keywords: result.keywords,
      formatted: result.raw,
      source: result.source,
    });
  } catch (err: any) {
    console.error(`[Keywords] Error suggesting keywords: ${err.message}`);
    return c.json({
      error: 'KEYWORD_SUGGESTION_FAILED',
      message: err.message || 'Failed to suggest keywords',
    }, 500);
  }
});

const PORT = Number(process.env.PORT) || 3001;

if (!process.env.VERCEL) {
  serve({
    fetch: app.fetch,
    port: PORT,
    hostname: '0.0.0.0',
  }, () => {
    console.log(`FIELDS Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
