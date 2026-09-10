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
  consumeUserEntitlement,
  addCreditsToUser,
  linkAccountByKey,
  logGenerationRecord,
} from './db.js';
import { buildGrokPrompt } from './prompt.js';
import { generateFieldNoteImage } from './grok.js';
import { generateGeminiImage } from './gemini.js';
import { suggestMemoryKeywords } from './keywords.js';

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

// User profile & entitlements
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
    entitlement,
  });
});

// Sync credits after verified RevenueCat purchase
app.post('/v1/credits/sync', async (c) => {
  try {
    const body = await c.req.json();
    const { installationId, deviceId, rcUserId, packageId = 'notes_20', creditsToAdd = 20 } = body;

    if (!installationId) {
      return c.json({ error: 'MISSING_INSTALLATION_ID', message: 'installationId is required' }, 400);
    }

    const updatedUser = await addCreditsToUser(installationId, Number(creditsToAdd) || 20, rcUserId, deviceId);
    const entitlement = determineEntitlement(updatedUser);

    return c.json({
      success: true,
      accountKey: updatedUser.account_key,
      freeUsed: updatedUser.free_used,
      adUsed: Boolean(updatedUser.ad_used),
      credits: updatedUser.credits,
      entitlement,
    });
  } catch (err: any) {
    return c.json({ error: 'SYNC_ERROR', message: err.message }, 500);
  }
});

// Link existing account via Account Key (e.g. FIELD-XXXX-YYYY)
app.post('/v1/account/link', async (c) => {
  try {
    const body = await c.req.json();
    const { installationId, accountKey, deviceId } = body;

    if (!accountKey || typeof accountKey !== 'string') {
      return c.json({ error: 'MISSING_ACCOUNT_KEY', message: 'Account key is required' }, 400);
    }

    if (!installationId) {
      return c.json({ error: 'MISSING_INSTALLATION_ID', message: 'installationId is required' }, 400);
    }

    const linkedUser = await linkAccountByKey(installationId, accountKey, deviceId);
    const entitlement = determineEntitlement(linkedUser);

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
    console.error('[Account Link] Error:', err);
    return c.json({ error: 'LINK_ERROR', message: err.message || 'Failed to link account key.' }, 400);
  }
});

// Generate Field Note Poster
app.post('/v1/notes', async (c) => {
  const noteId = `fn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let installationId = '';
  let deviceId: string | undefined;
  let entitlementClaim: 'free' | 'ad' | 'credit' | 'pro' = 'free';

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
      entitlementClaim = (body['entitlement'] as any) || 'free';
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
      entitlementClaim = body.entitlement || 'free';
      place = body.place || '';
      number = body.number || '01';
      keywords = body.keywords || [];
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

    // Step 1: Verify Entitlement in Database with Persistent Anti-Abuse deviceId
    const user = await getOrCreateUser(installationId, rcUserId, deviceId);
    const validEntitlement = determineEntitlement(user);

    if (entitlementClaim !== 'pro') {
      if (validEntitlement === 'paywall') {
        return c.json({
          error: 'PAYWALL_REQUIRED',
          message: 'No remaining free notes, ad allowance, or credits. Please purchase notes.',
          userState: {
            freeUsed: user.free_used,
            adUsed: Boolean(user.ad_used),
            credits: user.credits,
            entitlement: 'paywall',
          },
        }, 402);
      }

      if (entitlementClaim !== validEntitlement && !(entitlementClaim === 'credit' && user.credits > 0)) {
        return c.json({
          error: 'INVALID_ENTITLEMENT_CLAIM',
          message: `Claimed ${entitlementClaim} but current valid entitlement is ${validEntitlement}`,
        }, 403);
      }
    }

    // Step 2: Build server-owned locked prompt
    const prompt = buildGrokPrompt({
      place,
      number,
      keywords,
      year,
    });

    console.log(`[Notes] Generating note ${noteId} for ${installationId} (dev: ${deviceId || 'none'}) under ${entitlementClaim} with model ${model || 'default'}...`);

    // Step 3: Execute Image generation (Gemini or Grok Imagine)
    const isGeminiModel = model?.toLowerCase().startsWith('gemini');
    const result = isGeminiModel
      ? await generateGeminiImage({
          imageBuffer,
          mimeType,
          prompt,
          model,
        })
      : await generateFieldNoteImage({
          imageBuffer,
          mimeType,
          prompt,
          model,
        });

    // Step 4: Decrement entitlement ONLY after successful image generation
    const consumed = await consumeUserEntitlement(installationId, entitlementClaim, deviceId);
    if (!consumed) {
      console.warn(`[Notes] Warning: Failed to consume entitlement for ${installationId}`);
    }

    // Step 5: Log anonymous generation record
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
