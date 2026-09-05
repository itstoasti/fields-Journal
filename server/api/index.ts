import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/index.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.url}`;

    // Buffer incoming body for POST/PUT/PATCH to eliminate serverless stream-hang issues
    let body: Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
      }
      if (chunks.length > 0) {
        body = Buffer.concat(chunks);
      }
    }

    // Build standard Web Request
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      // @ts-ignore
      duplex: 'half',
    });

    const response = await app.fetch(webReq);

    res.statusCode = response.status;
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    if (response.body) {
      const arrayBuffer = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('[Vercel Handler Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR', message: err?.message || String(err) }));
  }
}
