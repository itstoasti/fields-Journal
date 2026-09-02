import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

import {
  getOrCreateUser,
  determineEntitlement,
  consumeUserEntitlement,
  addCreditsToUser,
  logGenerationRecord,
} from './db.js';
import { buildGrokPrompt } from './prompt.js';
import { generateFieldNoteImage } from './grok.js';
import { generateGeminiImage } from './gemini.js';

dotenv.config();

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

import fs from 'node:fs';
import path from 'node:path';

// Web Download Page & Health check
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Download Field Notes APK</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #F4EFE6;
            color: #2B2A27;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
            box-sizing: border-box;
            text-align: center;
          }
          .card {
            background: #FFFFFF;
            border: 1px solid #D8CFC4;
            border-radius: 12px;
            padding: 32px 24px;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 4px 16px rgba(43,42,39,0.06);
          }
          h1 {
            font-family: monospace;
            font-size: 22px;
            letter-spacing: 2px;
            margin-bottom: 8px;
            color: #8C2D19;
          }
          p {
            font-size: 14px;
            color: #767064;
            line-height: 1.5;
            margin-bottom: 24px;
          }
          .download-btn {
            display: inline-block;
            background-color: #2B2A27;
            color: #F4EFE6;
            text-decoration: none;
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 1.5px;
            padding: 16px 28px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transition: background-color 0.2s;
          }
          .download-btn:active {
            background-color: #8C2D19;
          }
          .meta {
            margin-top: 20px;
            font-size: 12px;
            color: #A39B8E;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>FIELD NOTES</h1>
          <p>Download the Standalone Development APK with full unredacted photo GPS and media access permissions.</p>
          <a href="/apk" class="download-btn">DOWNLOAD APK (122 MB)</a>
          <div class="meta">v1.0.0 · Android Standalone Build</div>
        </div>
      </body>
    </html>
  `);
});

app.get('/apk', async (c) => {
  const possiblePaths = [
    path.resolve('../field-notes-debug.apk'),
    path.resolve('./field-notes-debug.apk'),
    path.resolve('../android/app/build/outputs/apk/debug/app-debug.apk')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const fileBuffer = fs.readFileSync(p);
      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="field-notes-debug.apk"',
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }
  }

  return c.text('APK file not found on server.', 404);
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'field-notes-api',
    timestamp: new Date().toISOString(),
  });
});

// User profile & entitlements
app.get('/v1/me', (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const queryId = c.req.query('installationId');
  const installationId = token || queryId;

  if (!installationId) {
    return c.json({ error: 'MISSING_INSTALLATION_ID', message: 'installationId is required' }, 400);
  }

  const user = getOrCreateUser(installationId);
  const entitlement = determineEntitlement(user);

  return c.json({
    installationId: user.installation_id,
    rcUserId: user.rc_user_id,
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
    const { installationId, rcUserId, packageId = 'notes_20', creditsToAdd = 20 } = body;

    if (!installationId) {
      return c.json({ error: 'MISSING_INSTALLATION_ID', message: 'installationId is required' }, 400);
    }

    const updatedUser = addCreditsToUser(installationId, Number(creditsToAdd) || 20, rcUserId);
    const entitlement = determineEntitlement(updatedUser);

    return c.json({
      success: true,
      freeUsed: updatedUser.free_used,
      adUsed: Boolean(updatedUser.ad_used),
      credits: updatedUser.credits,
      entitlement,
    });
  } catch (err: any) {
    return c.json({ error: 'SYNC_ERROR', message: err.message }, 500);
  }
});

// Generate Field Note Poster
app.post('/v1/notes', async (c) => {
  const noteId = `fn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let installationId = '';
  let entitlementClaim: 'free' | 'ad' | 'credit' = 'free';

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

    // Step 1: Verify Entitlement in Database
    const user = getOrCreateUser(installationId, rcUserId);
    const validEntitlement = determineEntitlement(user);

    if (validEntitlement === 'paywall') {
      return c.json({
        error: 'PAYWALL_REQUIRED',
        message: 'No remaining free notes, ad allowance, or credits. Please purchase notes.',
        userState: {
          freeUsed: user.free_used,
          adUsed: Boolean(user.ad_used),
          credits: user.credits,
        },
      }, 402);
    }

    if (entitlementClaim !== validEntitlement && !(entitlementClaim === 'credit' && user.credits > 0)) {
      return c.json({
        error: 'INVALID_ENTITLEMENT_CLAIM',
        message: `Claimed ${entitlementClaim} but current valid entitlement is ${validEntitlement}`,
      }, 403);
    }

    // Step 2: Build server-owned locked prompt
    const prompt = buildGrokPrompt({
      place,
      number,
      keywords,
      year,
    });

    console.log(`[Notes] Generating note ${noteId} for ${installationId} under ${entitlementClaim} with model ${model || 'default'}...`);

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
    const consumed = consumeUserEntitlement(installationId, entitlementClaim);
    if (!consumed) {
      console.warn(`[Notes] Warning: Failed to consume entitlement for ${installationId}`);
    }

    // Step 5: Log anonymous generation record
    logGenerationRecord(noteId, installationId, place, number, 'success', result.modelUsed);

    const updatedUser = getOrCreateUser(installationId);

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
    console.error(`[Notes] Error generating note ${noteId}:`, err);
    if (installationId) {
      logGenerationRecord(noteId, installationId, '', '', 'failed', err.message);
    }

    return c.json({
      error: 'GENERATION_FAILED',
      message: err.message || 'An error occurred during field note generation.',
    }, 500);
  }
});

const port = Number(process.env.PORT) || 3001;
console.log(`FIELD NOTES Backend Server running on http://0.0.0.0:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});
