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
  logAppEvent,
  logBatchAppEvents,
  getAdminStats,
  getSystemSetting,
  setSystemSetting,
  createOrUpdateBlogPost,
  getBlogPostBySlug,
  getBlogPost,
  updateBlogPost,
  listBlogPosts,
  deleteBlogPost,
  incrementBlogPostViews,
  getInternalLinkTargets,
  getBlogStats,
  BlogPost,
  saveBlogMedia,
  getBlogMedia,
  listBlogMedia,
  deleteBlogMedia,
} from './db.js';
import { buildGrokPrompt } from './prompt.js';
import { generateFieldNoteImage } from './grok.js';
import { generateGeminiImage } from './gemini.js';
import { suggestMemoryKeywords } from './keywords.js';
import { renderAdminDashboardHtml } from './adminHtml.js';
import { auditBlogPostSeo } from './seoValidator.js';
import {
  markdownToHtml,
  renderBlogIndexHtml,
  renderBlogPostHtml,
  generateSitemapXml,
  generateRssFeedXml,
  generateLlmsTxt,
  slugify,
} from './blogRenderer.js';
import { pingIndexNow, INDEXNOW_KEY } from './indexnow.js';

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

// Agent & SEO Auth Verification (Accepts AGENT_API_KEY, standard agent key, or Admin PIN)
function verifyAgentAuth(c: any): boolean {
  const defaultAgentKey = 'fields_agent_sec_2026_x89a1c';
  const configuredAgentKey = process.env.AGENT_API_KEY;
  const adminPin = process.env.ADMIN_PIN || process.env.ADMIN_KEY || 'fields_sec_adm_2026_x89a1c';

  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  const queryKey = c.req.query('key') || c.req.query('api_key');
  const provided = token || queryKey;
  if (!provided) return false;

  const validKeys = [configuredAgentKey, defaultAgentKey, adminPin].filter(Boolean) as string[];
  for (const candidate of validKeys) {
    try {
      const bufA = Buffer.from(provided);
      const bufB = Buffer.from(candidate);
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return true;
      }
    } catch {
      if (provided === candidate) return true;
    }
  }
  return false;
}

// ==========================================
// TECHNICAL SEO & GENERATIVE ENGINE (GEO) ROUTES
// ==========================================

// 1. Dynamic robots.txt
app.get('/robots.txt', (c) => {
  const robotsTxt = `# robots.txt for travel-scrapbook.com
User-agent: *
Allow: /
Allow: /blog
Allow: /blog/*
Disallow: /admin
Disallow: /admin/*
Disallow: /v1/

# Search Engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# AI Crawlers & LLM Retrieval Engines
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

Sitemap: https://travel-scrapbook.com/sitemap.xml
`;
  c.header('Content-Type', 'text/plain; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
  return c.text(robotsTxt);
});

// 2. Dynamic sitemap.xml
app.get('/sitemap.xml', async (c) => {
  try {
    const posts = await listBlogPosts({ status: 'published', limit: 500 });
    const sitemapXml = generateSitemapXml(posts);
    c.header('Content-Type', 'application/xml; charset=utf-8');
    c.header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return c.body(sitemapXml);
  } catch (err) {
    console.error('[SEO] Sitemap generation error:', err);
    return c.text('Error generating sitemap', 500);
  }
});

// 3. LLMs Knowledge Standard (/llms.txt)
app.get('/llms.txt', async (c) => {
  try {
    const posts = await listBlogPosts({ status: 'published', limit: 100 });
    const llmsTxt = generateLlmsTxt(posts);
    c.header('Content-Type', 'text/markdown; charset=utf-8');
    c.header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return c.text(llmsTxt);
  } catch (err) {
    return c.text('# Fields (travel-scrapbook.com)\nTravel scrapbook app.', 200);
  }
});

// 4. RSS 2.0 Feeds
app.get('/rss.xml', async (c) => {
  const posts = await listBlogPosts({ status: 'published', limit: 50 });
  c.header('Content-Type', 'application/rss+xml; charset=utf-8');
  c.header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return c.body(generateRssFeedXml(posts));
});

app.get('/feed.xml', async (c) => {
  const posts = await listBlogPosts({ status: 'published', limit: 50 });
  c.header('Content-Type', 'application/rss+xml; charset=utf-8');
  c.header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return c.body(generateRssFeedXml(posts));
});

// 5. IndexNow Ownership Verification File
app.get(`/${INDEXNOW_KEY}.txt`, (c) => {
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(INDEXNOW_KEY);
});

// ==========================================
// PUBLIC BLOG PAGES (/blog and /blog/:slug)
// ==========================================

// Public Blog Index
app.get('/blog', async (c) => {
  try {
    const posts = await listBlogPosts({ status: 'published', limit: 60 });
    c.header('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    return c.html(renderBlogIndexHtml(posts));
  } catch (err) {
    console.error('[Blog] Index error:', err);
    return c.html('<h1>Unable to load blog</h1>', 500);
  }
});

// Public Blog Article Reader
app.get('/blog/:slug', async (c) => {
  const slug = c.req.param('slug');
  try {
    const post = await getBlogPostBySlug(slug);
    if (!post) {
      return c.html(`
        <!DOCTYPE html><html><head><title>Story Not Found | Fields</title><style>body{font-family:serif;background:#F4EFE6;color:#1C1917;text-align:center;padding:80px 20px;}</style></head>
        <body><h1>Article Not Found</h1><p>The travel note you requested does not exist or has been moved.</p><p><a href="/blog" style="color:#B9381E;">&larr; Back to Journal</a></p></body></html>
      `, 404);
    }

    // If draft, require agent or admin authentication to preview
    if (post.status === 'draft' && !verifyAgentAuth(c) && !verifyAdminAuth(c)) {
      return c.html(`
        <!DOCTYPE html><html><head><title>Draft Preview | Fields</title><style>body{font-family:serif;background:#F4EFE6;color:#1C1917;text-align:center;padding:80px 20px;}</style></head>
        <body><h1>Draft Article</h1><p>This article is currently in draft mode. Provide your agent API key in the URL parameter (?key=...) to preview.</p><p><a href="/blog" style="color:#B9381E;">&larr; Back to Journal</a></p></body></html>
      `, 403);
    }

    // Increment view counter asynchronously
    incrementBlogPostViews(slug).catch(() => {});

    // Fetch up to 3 related posts
    const allPosts = await listBlogPosts({ status: 'published', limit: 4 });
    const related = allPosts.filter(p => p.slug !== slug);

    c.header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return c.html(renderBlogPostHtml(post, related));
  } catch (err) {
    console.error('[Blog] Post render error:', err);
    return c.html('<h1>Error reading article</h1>', 500);
  }
});

// ==========================================
// AGENT BLOG & SEO APIS
// ==========================================

// Internal Link Building Targets API for Muse / OpenClaw / Hermes
app.get('/v1/blog/seo/link-targets', async (c) => {
  try {
    const linkTargets = await getInternalLinkTargets();
    return c.json({
      success: true,
      site_domain: 'https://travel-scrapbook.com',
      data: linkTargets,
      instructions: 'Use these internal URLs and anchor text variations when writing articles to build strong topic clusters and drive user conversions.',
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to fetch link targets' }, 500);
  }
});

// Unified Blog Post Update Handler for PATCH, PUT, POST /v1/blog/posts/:slugOrId, /v1/blog/update, and /v1/blog/publish updates
async function handleUpdateBlogPost(c: any, targetSlugOrId?: string, parsedBody?: any) {
  if (!verifyAgentAuth(c) && !verifyAdminAuth(c)) {
    return c.json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or missing agent API key. Send via Authorization: Bearer <KEY> or ?key=<KEY>',
    }, 401);
  }

  try {
    const body = parsedBody || (await c.req.json());
    const slugOrId = targetSlugOrId || body.slug || body.id;
    if (!slugOrId) {
      return c.json({ error: 'BAD_REQUEST', message: 'Missing slug or id for article update' }, 400);
    }

    const existing = await getBlogPost(slugOrId);
    if (!existing) {
      return c.json({ error: 'NOT_FOUND', message: `Article with slug or id "${slugOrId}" not found` }, 404);
    }

    // Merge incoming changes
    const newTitle = body.title !== undefined ? String(body.title).trim() : existing.title;
    const newMarkdown = body.content_markdown !== undefined ? String(body.content_markdown) : existing.content_markdown;
    const newFeaturedImage = body.featured_image_url !== undefined
      ? (body.featured_image_url ? String(body.featured_image_url).trim() : null)
      : existing.featured_image_url;
    const newFeaturedAlt = body.featured_image_alt !== undefined
      ? (body.featured_image_alt ? String(body.featured_image_alt).trim() : null)
      : existing.featured_image_alt;
    const newFeaturedCaption = body.featured_image_caption !== undefined
      ? (body.featured_image_caption ? String(body.featured_image_caption).trim() : null)
      : existing.featured_image_caption;
    const newMetaDesc = body.meta_description !== undefined ? String(body.meta_description).trim() : existing.meta_description;
    const newFocusKeywords = body.focus_keywords !== undefined
      ? (Array.isArray(body.focus_keywords) ? body.focus_keywords : [body.focus_keywords])
      : existing.focus_keywords;
    const newSeoTitle = body.seo_title !== undefined ? String(body.seo_title).trim() : existing.seo_title;
    const newStatus = body.status !== undefined ? (body.status === 'draft' ? 'draft' : 'published') : existing.status;
    const newSlug = body.new_slug ? slugify(body.new_slug) : existing.slug;
    const newCanonical = body.canonical_url || existing.canonical_url || `https://travel-scrapbook.com/blog/${newSlug}`;
    const newAuthor = body.author || existing.author;
    const newFaqItems = body.faq_items !== undefined ? (Array.isArray(body.faq_items) ? body.faq_items : []) : existing.faq_items;

    // Run automated RankMath / Yoast SEO Audit on the merged state
    const seoAudit = auditBlogPostSeo({
      title: newTitle,
      seo_title: newSeoTitle,
      slug: newSlug,
      meta_description: newMetaDesc,
      focus_keywords: newFocusKeywords,
      content_markdown: newMarkdown,
      featured_image_url: newFeaturedImage,
      featured_image_alt: newFeaturedAlt,
      canonical_url: newCanonical,
      faq_items: newFaqItems,
    });

    const updated = await updateBlogPost(existing.id, {
      slug: newSlug,
      title: newTitle,
      seo_title: newSeoTitle,
      meta_description: newMetaDesc,
      content_markdown: newMarkdown,
      content_html: markdownToHtml(newMarkdown),
      focus_keywords: newFocusKeywords,
      featured_image_url: newFeaturedImage,
      featured_image_alt: newFeaturedAlt,
      featured_image_caption: newFeaturedCaption,
      canonical_url: newCanonical,
      robots: body.robots || existing.robots,
      schema_type: body.schema_type || existing.schema_type,
      faq_items: newFaqItems,
      author: newAuthor,
      seo_score: seoAudit.score,
      seo_feedback: seoAudit.summary,
      status: newStatus,
    });

    if (!updated) {
      return c.json({ error: 'UPDATE_FAILED', message: 'Failed to update article in database' }, 500);
    }

    // Auto-ping IndexNow if post is published
    if (updated.status === 'published' && body.ping_indexnow !== false) {
      pingIndexNow([`https://travel-scrapbook.com/blog/${updated.slug}`, 'https://travel-scrapbook.com/sitemap.xml']).catch((err) => {
        console.warn('[IndexNow] Background ping warning:', err);
      });
    }

    return c.json({
      success: true,
      message: 'Article updated successfully',
      post: {
        id: updated.id,
        slug: updated.slug,
        url: `https://travel-scrapbook.com/blog/${updated.slug}`,
        title: updated.title,
        status: updated.status,
        featured_image_url: updated.featured_image_url,
        featured_image_alt: updated.featured_image_alt,
        featured_image_caption: updated.featured_image_caption,
        meta_description: updated.meta_description,
        focus_keywords: updated.focus_keywords,
        seo_score: updated.seo_score,
        reading_time_minutes: updated.reading_time_minutes,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
      seo_audit: {
        score: seoAudit.score,
        is_passing: seoAudit.isPassing,
        passed_checks: seoAudit.passedChecks,
        total_checks: seoAudit.totalChecks,
        feedback: seoAudit.feedback,
        recommendations: seoAudit.summary,
      },
    });
  } catch (err: any) {
    console.error('[Blog] Update error:', err);
    return c.json({ error: err?.message || 'Failed to update article' }, 500);
  }
}

// Agent Article Publishing & RankMath SEO Auditor API (Creates new or updates existing)
app.post('/v1/blog/publish', async (c) => {
  if (!verifyAgentAuth(c) && !verifyAdminAuth(c)) {
    return c.json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or missing agent API key. Send via Authorization: Bearer <KEY> or ?key=<KEY>',
    }, 401);
  }

  try {
    const body = await c.req.json();

    // Check if updating an existing post by slug or id
    const candidateSlugOrId = body.slug || body.id;
    if (candidateSlugOrId) {
      const existing = await getBlogPost(candidateSlugOrId);
      if (existing) {
        return await handleUpdateBlogPost(c, existing.id, body);
      }
    }

    if (!body.title || typeof body.title !== 'string') {
      return c.json({ error: 'Missing required field: title' }, 400);
    }
    if (!body.content_markdown || typeof body.content_markdown !== 'string') {
      return c.json({ error: 'Missing required field: content_markdown' }, 400);
    }

    const slug = slugify(body.slug || body.title);
    const contentHtml = markdownToHtml(body.content_markdown);

    // Run automated RankMath / Yoast SEO Audit
    const seoAudit = auditBlogPostSeo({
      title: body.title,
      seo_title: body.seo_title,
      slug,
      meta_description: body.meta_description,
      focus_keywords: body.focus_keywords,
      content_markdown: body.content_markdown,
      featured_image_url: body.featured_image_url,
      featured_image_alt: body.featured_image_alt,
      canonical_url: body.canonical_url,
      faq_items: body.faq_items,
    });

    const status = (body.status === 'draft' ? 'draft' : 'published') as 'draft' | 'published';

    const savedPost = await createOrUpdateBlogPost({
      id: body.id,
      slug,
      title: body.title.trim(),
      seo_title: (body.seo_title || body.title).trim(),
      meta_description: (body.meta_description || '').trim(),
      content_markdown: body.content_markdown,
      content_html: contentHtml,
      focus_keywords: Array.isArray(body.focus_keywords) ? body.focus_keywords : [],
      featured_image_url: body.featured_image_url || null,
      featured_image_alt: body.featured_image_alt || null,
      featured_image_caption: body.featured_image_caption || null,
      canonical_url: body.canonical_url || `https://travel-scrapbook.com/blog/${slug}`,
      robots: body.robots || 'index, follow',
      schema_type: body.schema_type || 'Article',
      faq_items: Array.isArray(body.faq_items) ? body.faq_items : [],
      author: body.author || 'Fields Editorial',
      seo_score: seoAudit.score,
      seo_feedback: seoAudit.summary,
      status,
    });

    // Auto-ping IndexNow if post is published
    if (status === 'published' && body.ping_indexnow !== false) {
      pingIndexNow([`https://travel-scrapbook.com/blog/${slug}`, 'https://travel-scrapbook.com/sitemap.xml']).catch((err) => {
        console.warn('[IndexNow] Background ping warning:', err);
      });
    }

    return c.json({
      success: true,
      message: status === 'published' ? 'Article published and indexed successfully' : 'Article draft saved',
      post: {
        id: savedPost.id,
        slug: savedPost.slug,
        url: `https://travel-scrapbook.com/blog/${savedPost.slug}`,
        title: savedPost.title,
        status: savedPost.status,
        featured_image_url: savedPost.featured_image_url,
        featured_image_alt: savedPost.featured_image_alt,
        seo_score: savedPost.seo_score,
        reading_time_minutes: savedPost.reading_time_minutes,
        created_at: savedPost.created_at,
      },
      seo_audit: {
        score: seoAudit.score,
        is_passing: seoAudit.isPassing,
        passed_checks: seoAudit.passedChecks,
        total_checks: seoAudit.totalChecks,
        feedback: seoAudit.feedback,
        recommendations: seoAudit.summary,
      },
    });
  } catch (err: any) {
    console.error('[Blog] Publish error:', err);
    return c.json({ error: err?.message || 'Failed to publish article' }, 500);
  }
});

// Agent Media Upload API (Supports Multipart Form Data, Raw Binary, Base64 JSON, or Image URL)
app.post('/v1/blog/media/upload', async (c) => {
  if (!verifyAgentAuth(c) && !verifyAdminAuth(c)) {
    return c.json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or missing agent API key. Send via Authorization: Bearer <KEY> or ?key=<KEY>',
    }, 401);
  }

  try {
    const contentType = (c.req.header('content-type') || '').toLowerCase();
    let buffer: Buffer | undefined;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';
    let preferredFilename: string | undefined = c.req.query('filename');
    let altText: string | undefined = c.req.query('alt');

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const fileEntry = formData.get('file') || formData.get('image') || formData.get('media');
      if (!fileEntry || typeof fileEntry === 'string') {
        return c.json({ error: 'BAD_REQUEST', message: 'No file or image provided in form data' }, 400);
      }
      const fileObj = fileEntry as File;
      const arrayBuffer = await fileObj.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      if (fileObj.type) mimeType = fileObj.type;
      if (fileObj.name) preferredFilename = preferredFilename || fileObj.name;
      const formAlt = formData.get('alt') || formData.get('altText');
      if (typeof formAlt === 'string') altText = formAlt;
    } else if (contentType.startsWith('image/') || contentType === 'application/octet-stream') {
      const arrayBuffer = await c.req.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      if (contentType.startsWith('image/')) mimeType = contentType.split(';')[0].trim();
    } else {
      // JSON payload
      const body = await c.req.json().catch(() => ({}));
      if (body.filename) preferredFilename = preferredFilename || body.filename;
      if (body.altText || body.alt) altText = altText || body.altText || body.alt;

      if (body.imageUrl && typeof body.imageUrl === 'string') {
        const resp = await fetch(body.imageUrl);
        if (!resp.ok) {
          return c.json({ error: `Failed to download image from imageUrl: HTTP ${resp.status}` }, 400);
        }
        const arrayBuffer = await resp.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        const fetchedContentType = resp.headers.get('content-type') || '';
        if (fetchedContentType.startsWith('image/')) {
          mimeType = fetchedContentType.split(';')[0].trim();
        }
      } else {
        const base64Str = body.imageBase64 || body.image || body.data;
        if (base64Str && typeof base64Str === 'string') {
          const cleanBase64 = base64Str.replace(/^data:image\/[a-z]+;base64,/, '');
          buffer = Buffer.from(cleanBase64, 'base64');
          if (body.mimeType) mimeType = body.mimeType;
        }
      }
    }

    if (!buffer || buffer.length === 0) {
      return c.json({
        error: 'BAD_REQUEST',
        message: 'No image data detected. Provide a file via multipart/form-data (-F "file=@..."), raw binary with Content-Type: image/*, or JSON with imageBase64 / imageUrl.',
      }, 400);
    }

    // Determine extension from mimeType or filename
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('svg')) ext = 'svg';
    else ext = 'jpg';

    let cleanName = preferredFilename
      ? slugify(path.basename(preferredFilename, path.extname(preferredFilename)))
      : `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (!cleanName || cleanName === 'file' || cleanName === 'image') {
      cleanName = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }
    const filename = `${cleanName}.${ext}`;

    // 1. Save permanently to Turso Cloud database
    await saveBlogMedia({
      filename,
      mime_type: mimeType,
      data_base64: buffer.toString('base64'),
      byte_size: buffer.length,
    });

    // 2. Also write to local filesystem if writable (dev / local fast cache)
    const uploadDirs = [
      path.resolve(process.cwd(), 'public', 'assets', 'uploads'),
      path.resolve(process.cwd(), 'dist', 'assets', 'uploads'),
    ];
    for (const dir of uploadDirs) {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
      } catch {
        // Non-fatal in read-only / serverless environment
      }
    }

    const publicUrl = `https://travel-scrapbook.com/v1/blog/media/${filename}`;
    const directUrl = `https://travel-scrapbook.com/assets/uploads/${filename}`;

    return c.json({
      success: true,
      url: publicUrl,
      direct_url: directUrl,
      filename,
      size_bytes: buffer.length,
      mime_type: mimeType,
      alt_text: altText || cleanName.replace(/[-_]+/g, ' '),
      instructions: 'You can now set this url directly as featured_image_url in PATCH /v1/blog/posts/:slug or POST /v1/blog/publish.',
    });
  } catch (err: any) {
    console.error('[Media Upload Error]:', err);
    return c.json({ error: err?.message || 'Failed to process media upload' }, 500);
  }
});

// Public Media Serving Handler (backed by Turso Cloud Database)
async function handleServeMedia(c: any) {
  const filenameOrId = c.req.param('filenameOrId');
  try {
    const media = await getBlogMedia(filenameOrId);
    if (!media) {
      return c.text('Image not found', 404);
    }
    const buffer = Buffer.from(media.data_base64, 'base64');
    c.header('Content-Type', media.mime_type || 'image/jpeg');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    c.header('Content-Disposition', `inline; filename="${media.filename}"`);
    return c.body(buffer);
  } catch (err: any) {
    console.error('[Media Serve Error]:', err);
    return c.text('Failed to load media', 500);
  }
}

app.get('/v1/blog/media/:filenameOrId', handleServeMedia);
app.get('/assets/uploads/:filenameOrId', handleServeMedia);

// List Uploaded Media (API)
app.get('/v1/blog/media', async (c) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 50)));
    const mediaList = await listBlogMedia(limit);
    return c.json({ success: true, count: mediaList.length, media: mediaList });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to list media' }, 500);
  }
});

// Delete Uploaded Media (API)
app.delete('/v1/blog/media/:filenameOrId', async (c) => {
  if (!verifyAgentAuth(c) && !verifyAdminAuth(c)) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }
  const filenameOrId = c.req.param('filenameOrId');
  try {
    const deleted = await deleteBlogMedia(filenameOrId);
    return c.json({ success: deleted, message: deleted ? 'Media deleted' : 'Media not found' });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to delete media' }, 500);
  }
});

// List Blog Posts (API)
app.get('/v1/blog/posts', async (c) => {
  const statusParam = (c.req.query('status') || 'all') as 'all' | 'published' | 'draft';
  const limitParam = Math.min(100, Math.max(1, Number(c.req.query('limit') || 50)));
  const offsetParam = Math.max(0, Number(c.req.query('offset') || 0));

  try {
    const posts = await listBlogPosts({ status: statusParam, limit: limitParam, offset: offsetParam });
    return c.json({
      success: true,
      count: posts.length,
      posts: posts.map(p => ({
        id: p.id,
        slug: p.slug,
        url: `https://travel-scrapbook.com/blog/${p.slug}`,
        title: p.title,
        seo_title: p.seo_title,
        meta_description: p.meta_description,
        focus_keywords: p.focus_keywords,
        featured_image_url: p.featured_image_url,
        featured_image_alt: p.featured_image_alt,
        status: p.status,
        seo_score: p.seo_score,
        view_count: p.view_count,
        reading_time_minutes: p.reading_time_minutes,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to list blog posts' }, 500);
  }
});

// Get Single Blog Post with full markdown content for editing (API)
app.get('/v1/blog/posts/:slugOrId', async (c) => {
  const slugOrId = c.req.param('slugOrId');
  try {
    const post = await getBlogPost(slugOrId);
    if (!post) {
      return c.json({ error: 'NOT_FOUND', message: 'Article not found' }, 404);
    }
    return c.json({
      success: true,
      post: {
        id: post.id,
        slug: post.slug,
        url: `https://travel-scrapbook.com/blog/${post.slug}`,
        title: post.title,
        seo_title: post.seo_title,
        meta_description: post.meta_description,
        content_markdown: post.content_markdown,
        content_html: post.content_html,
        focus_keywords: post.focus_keywords,
        featured_image_url: post.featured_image_url,
        featured_image_alt: post.featured_image_alt,
        featured_image_caption: post.featured_image_caption,
        canonical_url: post.canonical_url,
        robots: post.robots,
        schema_type: post.schema_type,
        faq_items: post.faq_items,
        author: post.author,
        seo_score: post.seo_score,
        seo_feedback: post.seo_feedback,
        status: post.status,
        view_count: post.view_count,
        reading_time_minutes: post.reading_time_minutes,
        created_at: post.created_at,
        updated_at: post.updated_at,
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to retrieve article' }, 500);
  }
});

// Update Blog Post Routes (Supports PATCH, PUT, and POST for maximum agent compatibility)
app.patch('/v1/blog/posts/:slugOrId', (c) => handleUpdateBlogPost(c, c.req.param('slugOrId')));
app.put('/v1/blog/posts/:slugOrId', (c) => handleUpdateBlogPost(c, c.req.param('slugOrId')));
app.post('/v1/blog/posts/:slugOrId', (c) => handleUpdateBlogPost(c, c.req.param('slugOrId')));
app.post('/v1/blog/update', (c) => handleUpdateBlogPost(c));

// Delete Blog Post (API)
app.delete('/v1/blog/posts/:slugOrId', async (c) => {
  if (!verifyAgentAuth(c) && !verifyAdminAuth(c)) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  const slugOrId = c.req.param('slugOrId');
  const deleted = await deleteBlogPost(slugOrId);
  return c.json({ success: deleted, message: deleted ? 'Post deleted' : 'Post not found' });
});

// Admin Telemetry Dashboard (Mobile Web)
app.get('/admin', (c) => {
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  return c.html(renderAdminDashboardHtml());
});

// Admin Telemetry Stats API
app.get('/v1/admin/stats', async (c) => {
  if (!verifyAdminAuth(c)) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid admin PIN' }, 401);
  }

  try {
    const stats = await getAdminStats();
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    c.header('Pragma', 'no-cache');
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

// ==========================================
// STRIPE WEB CHECKOUT & WEBHOOK APIS
// ==========================================

// Public Checkout Links configuration (for website and web app)
app.get('/v1/checkout/links', async (c) => {
  try {
    const lifetimeUrl = await getSystemSetting('stripe_lifetime_url', process.env.STRIPE_LIFETIME_URL || '');
    const pack20Url = await getSystemSetting('stripe_pack20_url', process.env.STRIPE_PACK20_URL || '');
    return c.json({
      success: true,
      lifetime_url: lifetimeUrl,
      pack20_url: pack20Url,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to load checkout links' }, 500);
  }
});

// Admin endpoint to configure Stripe Payment Links
app.post('/v1/admin/checkout-links', async (c) => {
  if (!verifyAdminAuth(c) && !verifyAgentAuth(c)) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  try {
    const body = await c.req.json();
    if (body.lifetime_url !== undefined) {
      await setSystemSetting('stripe_lifetime_url', String(body.lifetime_url).trim());
    }
    if (body.pack20_url !== undefined) {
      await setSystemSetting('stripe_pack20_url', String(body.pack20_url).trim());
    }

    const lifetimeUrl = await getSystemSetting('stripe_lifetime_url', process.env.STRIPE_LIFETIME_URL || '');
    const pack20Url = await getSystemSetting('stripe_pack20_url', process.env.STRIPE_PACK20_URL || '');

    return c.json({
      success: true,
      message: 'Checkout links updated successfully',
      lifetime_url: lifetimeUrl,
      pack20_url: pack20Url,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to update checkout links' }, 500);
  }
});

// Stripe Webhook for Web Purchases (checkout.session.completed)
app.post('/v1/webhooks/stripe', async (c) => {
  try {
    const body = await c.req.json();
    const event = body.event || body;
    const type = event.type || body.type;

    console.log(`[Stripe Webhook] Received event: ${type}`);

    if (type === 'checkout.session.completed') {
      const session = event.data?.object || body.data?.object || {};
      const clientReferenceId = session.client_reference_id;
      const amountTotal = session.amount_total || 0; // cents: 2999 = $29.99, 299 = $2.99
      const txId = session.id || `stripe_${Date.now()}`;

      if (clientReferenceId) {
        if (amountTotal >= 1500) {
          // Lifetime Access ($29.99)
          console.log(`[Stripe Webhook] Granting Lifetime Pro to user: ${clientReferenceId}`);
          await setProStatus(clientReferenceId, true, null);
        } else {
          // 20 Notes Pack ($2.99)
          console.log(`[Stripe Webhook] Granting 20 credits to user: ${clientReferenceId}`);
          await recordVerifiedPurchase(txId, clientReferenceId, 'notes_20', 20);
        }
      } else {
        console.warn('[Stripe Webhook] Received checkout.session.completed without client_reference_id');
      }
    }

    return c.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook] Error:', err);
    return c.json({ error: 'STRIPE_WEBHOOK_ERROR', message: err?.message }, 500);
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

  // Auto-record app open event for telemetry & active user tracking
  if (deviceId && !isDeveloperDevice(deviceId, installationId)) {
    const platform = deviceId.startsWith('android_') ? 'android' : deviceId.startsWith('ios_') ? 'ios' : 'web';
    logAppEvent({
      installationId: user.installation_id,
      deviceId: user.device_id,
      eventName: 'app_open',
      platform,
      metadata: { source: 'me_sync' },
    }).catch(() => {});
  }

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

// Telemetry & User Funnel Events Ingestion
app.post('/v1/events', async (c) => {
  try {
    const body = await c.req.json();
    if (Array.isArray(body.events)) {
      await logBatchAppEvents(body.events);
    } else if (body.eventName) {
      await logAppEvent({
        installationId: body.installationId || 'anonymous',
        deviceId: body.deviceId || null,
        eventName: body.eventName,
        platform: body.platform,
        appVersion: body.appVersion,
        metadata: body.metadata,
      });
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: 'EVENT_LOG_ERROR', message: err.message || 'Failed to log events.' }, 400);
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
    const rawErrorMessage = err.rawResponse || err.message || '';
    const isModeration =
      Boolean(err.isModeration) ||
      err.code === 'CONTENT_MODERATED' ||
      rawErrorMessage.includes('content-moderated') ||
      rawErrorMessage.includes('content moderation') ||
      rawErrorMessage.includes('rejected by content moderation');

    const isTimeout =
      err.code === 'TIMEOUT' ||
      err.name === 'AbortError' ||
      rawErrorMessage.includes('timed out') ||
      rawErrorMessage.includes('timeout');

    let errorCode = 'GENERATION_FAILED';
    let errorTitle = 'Pressing Interrupted';
    let userFriendlyMessage = 'An unexpected hiccup occurred while processing your print.';
    let tip = 'Try running the press again, or choose a different photograph.';

    if (isModeration) {
      errorCode = 'CONTENT_MODERATED';
      errorTitle = 'Photo Could Not Be Pressed';
      userFriendlyMessage =
        'The AI printing press flagged this image under its automated safety guidelines. This commonly occurs with close-up photos of young children or recognized cartoon & branded clothing (such as Disney).';
      tip = 'Try a wider landscape shot, an environmental scene (like exploring a trail or trees), or a photo without cartoon graphics on clothing.';
    } else if (isTimeout) {
      errorCode = 'TIMEOUT';
      errorTitle = 'The Press Timed Out';
      userFriendlyMessage =
        'Carving this linocut plate took longer than expected and the studio connection timed out.';
      tip = 'Please check your connection and tap Retry to try pressing again.';
    }

    console.error(`[Notes] Generation error (${errorCode}): ${err.message}`);
    await logGenerationRecord(noteId, installationId, '', '', 'failed', `${errorCode}: ${err.message}`);

    const user = await getOrCreateUser(installationId, undefined, deviceId);

    return c.json({
      error: errorCode,
      title: errorTitle,
      message: userFriendlyMessage,
      tip,
      rawError: rawErrorMessage || err.message,
      userState: {
        freeUsed: user.free_used,
        adUsed: Boolean(user.ad_used),
        credits: user.credits,
        isPro: Boolean(user.is_pro),
        entitlement: determineEntitlement(user),
      },
    }, isModeration ? 422 : 500);
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
