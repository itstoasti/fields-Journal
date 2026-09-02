export interface LocationSuggestion {
  formatted: string;
  name: string;
  subtext?: string;
}

async function fetchWithTimeout(url: string, timeoutMs = 4000, headers?: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Searches for location suggestions with standardized formatting.
 * Examples:
 * - "Huntington beach" -> "Huntington Beach, California"
 * - "Kyoto" -> "Kyoto, Japan"
 * - "Paris" -> "Paris, France"
 * - "Acropolis" -> "Acropolis, Athens, Greece"
 */
export async function searchLocationSuggestions(query: string): Promise<LocationSuggestion[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const results: LocationSuggestion[] = [];
  const seen = new Set<string>();

  // 1. Open-Meteo Geocoding API (Fast, Free, High Coverage)
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=5&language=en&format=json`;
    const res = await fetchWithTimeout(url, 3500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) {
        for (const item of data.results) {
          const parts: string[] = [item.name];

          // For US locations: City, State
          if (item.country_code === 'US' && item.admin1) {
            parts.push(item.admin1);
          } else if (item.country) {
            // For international: City, Country (or City, State if Canada)
            if (item.admin1 && item.admin1 !== item.name && item.admin1 !== item.country && item.country_code === 'CA') {
              parts.push(item.admin1);
            }
            parts.push(item.country);
          }

          const formatted = parts.join(', ');
          if (!seen.has(formatted.toLowerCase())) {
            seen.add(formatted.toLowerCase());
            results.push({
              formatted,
              name: item.name,
              subtext: item.country || item.admin1,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[LocationSearch] Open-Meteo search error:', err);
  }

  // 2. Photon Geocoding fallback for landmarks / attractions
  if (results.length < 4) {
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=5&lang=en`;
      const res = await fetchWithTimeout(photonUrl, 3500, {
        'User-Agent': 'FieldsApp/1.0',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.features)) {
          for (const feat of data.features) {
            const p = feat.properties;
            if (!p?.name) continue;

            const parts: string[] = [p.name];
            if (p.city && p.city !== p.name) {
              parts.push(p.city);
            } else if (p.state && p.state !== p.name && (p.countrycode === 'US' || p.countrycode === 'CA')) {
              parts.push(p.state);
            }
            if (p.country && p.country !== p.name) {
              parts.push(p.country);
            }

            const formatted = parts.join(', ');
            if (!seen.has(formatted.toLowerCase())) {
              seen.add(formatted.toLowerCase());
              results.push({
                formatted,
                name: p.name,
                subtext: p.country || p.state,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[LocationSearch] Photon search error:', err);
    }
  }

  return results.slice(0, 5);
}
