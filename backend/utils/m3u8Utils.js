const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const AD_KEYWORDS = ['/v7/', '/adjump/', 'google', 'ads', 'doubleclick', 'facebook'];

/**
 * Process M3U8 stream - returns content with DIRECT URLs (for hybrid approach)
 * Frontend will handle CORS detection and switch to proxy if needed
 */
async function processM3u8StreamDirect(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
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
        return `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}`;
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

      if (line.includes('#EXT-X-DISCONTINUITY')) continue;

      if (!line.startsWith('#')) {
        if (!line.startsWith('http')) {
          line = new URL(line, baseUrl).toString();
        }
        if (line.includes('convertv7/')) {
          line = line.replace('convertv7/', '');
        }
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
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
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
        return `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}`;
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

      if (line.includes('#EXT-X-DISCONTINUITY')) continue;

      if (!line.startsWith('#')) {
        let segmentUrl = line;
        if (!segmentUrl.startsWith('http')) {
          segmentUrl = new URL(segmentUrl, baseUrl).toString();
        }
        if (segmentUrl.includes('convertv7/')) {
          segmentUrl = segmentUrl.replace('convertv7/', '');
        }
        line = `${tsProxyBase}?url=${encodeURIComponent(segmentUrl)}`;
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
  AD_KEYWORDS
};
