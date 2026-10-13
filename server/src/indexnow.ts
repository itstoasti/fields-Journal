export const INDEXNOW_KEY = 'fields_indexnow_2026';
export const INDEXNOW_KEY_LOCATION = `https://travel-scrapbook.com/${INDEXNOW_KEY}.txt`;
export const SITE_HOST = 'travel-scrapbook.com';

export async function pingIndexNow(urls: string[]): Promise<boolean> {
  if (!urls || urls.length === 0) return false;

  const validUrls = urls.map(u => u.startsWith('http') ? u : `https://${SITE_HOST}${u.startsWith('/') ? '' : '/'}${u}`);

  try {
    const payload = {
      host: SITE_HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: validUrls,
    };

    console.log(`[IndexNow] Submitting ${validUrls.length} URL(s) to IndexNow API...`);
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 202) {
      console.log(`[IndexNow] Successfully submitted URLs to IndexNow (Status: ${res.status})`);
      return true;
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`[IndexNow] Ping returned non-OK status ${res.status}: ${errText}`);
      return false;
    }
  } catch (err) {
    console.error('[IndexNow] Failed to send IndexNow ping:', err);
    return false;
  }
}
