const { buildSourceHeaders, fetchWithIpv4 } = require('./httpFetch');

const AD_KEYWORDS = ['/v7/', '/v8/', '/adjump/', 'google', 'ads', 'doubleclick', 'facebook'];
const OVERLAY_SEGMENT_PREFIXES = ['convertv7/', 'convertv8/'];

function stripOverlaySegmentPrefixes(segmentUrl) {
  return OVERLAY_SEGMENT_PREFIXES.reduce(
    (nextUrl, prefix) => nextUrl.replace(prefix, ''),
    String(segmentUrl || ''),
  );
}

function appendQueryParams(baseUrl, params = {}) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null,
  );

  try {
    const nextUrl = new URL(baseUrl);
    entries.forEach(([key, value]) => {
      nextUrl.searchParams.set(key, String(value));
    });
    return nextUrl.toString();
  } catch (_error) {
    const query = entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    if (!query) return baseUrl;
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query}`;
  }
}

/**
 * Process M3U8 stream - returns content with DIRECT URLs (for hybrid approach)
 * Filters ads but keeps original segment URLs (client will fetch directly)
 */
async function processM3u8StreamDirect(url, proxyBase = null) {
  const response = await fetchWithIpv4(url, {
    headers: buildSourceHeaders(url),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch M3U8: ${response.statusText}`);
  }

  const content = await response.text();
  const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
  const isMasterPlaylist = content.includes('#EXT-X-STREAM-INF');

  let cleanContent;

  if (isMasterPlaylist) {
    const lines = content.split('\n');
    const rewrittenLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const absoluteUrl = trimmed.startsWith('http')
          ? trimmed
          : new URL(trimmed, baseUrl).toString();
        // Sub-playlists must still go through proxy for ad filtering,
        // only TS segments (in media playlists) will be direct
        if (proxyBase) {
          return appendQueryParams(proxyBase, { url: absoluteUrl, mode: 'direct' });
        }
        return absoluteUrl;
      }
      return line;
    });
    cleanContent = rewrittenLines.join('\n');
  } else {
    const lines = content.split('\n');
    const cleanLines = [];
    let skipNext = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF')) {
        const nextLine = (lines[i + 1] || '').trim();
        if (nextLine && !nextLine.startsWith('#')) {
          const isAd = AD_KEYWORDS.some((k) => nextLine.includes(k));
          if (isAd) {
            skipNext = true;
            continue;
          }
        }
      }

      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (!line.startsWith('#')) {
        if (!line.startsWith('http')) {
          line = new URL(line, baseUrl).toString();
        }
        line = stripOverlaySegmentPrefixes(line);
      }
      cleanLines.push(line);
    }

    cleanContent = cleanLines.join('\n');
  }

  return cleanContent;
}

/**
 * Process M3U8 stream - returns content with PROXY URLs (for VPN users)
 */
async function processM3u8StreamWithProxy(url, proxyBase, tsProxyBase) {
  const response = await fetchWithIpv4(url, {
    headers: buildSourceHeaders(url),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch M3U8: ${response.statusText}`);
  }

  const content = await response.text();
  const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
  const isMasterPlaylist = content.includes('#EXT-X-STREAM-INF');

  let cleanContent;

  if (isMasterPlaylist) {
    const lines = content.split('\n');
    const rewrittenLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const absoluteUrl = trimmed.startsWith('http')
          ? trimmed
          : new URL(trimmed, baseUrl).toString();
        return appendQueryParams(proxyBase, { url: absoluteUrl, mode: 'proxy' });
      }
      return line;
    });
    cleanContent = rewrittenLines.join('\n');
  } else {
    const lines = content.split('\n');
    const cleanLines = [];
    let skipNext = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF')) {
        const nextLine = (lines[i + 1] || '').trim();
        if (nextLine && !nextLine.startsWith('#')) {
          const isAd = AD_KEYWORDS.some((k) => nextLine.includes(k));
          if (isAd) {
            skipNext = true;
            continue;
          }
        }
      }

      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (!line.startsWith('#')) {
        let segmentUrl = line;
        if (!segmentUrl.startsWith('http')) {
          segmentUrl = new URL(segmentUrl, baseUrl).toString();
        }
        segmentUrl = stripOverlaySegmentPrefixes(segmentUrl);
        line = appendQueryParams(tsProxyBase, { url: segmentUrl });
      }
      cleanLines.push(line);
    }

    cleanContent = cleanLines.join('\n');
  }

  return cleanContent;
}

/**
 * Process M3U8 stream (legacy - backward compatible)
 */
async function processM3u8Stream(url, proxyBase, tsProxyBase) {
  if (tsProxyBase) {
    return processM3u8StreamWithProxy(url, proxyBase, tsProxyBase);
  }
  return processM3u8StreamDirect(url);
}

module.exports = {
  processM3u8Stream,
  processM3u8StreamDirect,
  processM3u8StreamWithProxy,
  appendQueryParams,
  stripOverlaySegmentPrefixes,
  OVERLAY_SEGMENT_PREFIXES,
  AD_KEYWORDS,
};
