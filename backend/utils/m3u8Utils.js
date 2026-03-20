const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const AD_KEYWORDS = ['/v7/', '/adjump/', 'google', 'ads', 'doubleclick', 'facebook'];

/**
 * Process an M3U8 stream to filter out advertisements and rewrite URLs.
 * 
 * - Master Playlist: rewrites sub-playlist URLs to go through the proxyBase.
 * - Media Playlist: filters ad segments and rewrites relative URLs to absolute.
 * 
 * @param {string} url - Target M3U8 URL
 * @param {string} proxyBase - The base URL of the proxy endpoint (e.g. "https://your-server/api/v1/movies/proxy-m3u8")
 * @returns {Promise<string>} The parsed and cleaned M3U8 playlist content
 */
async function processM3u8Stream(url, proxyBase) {
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

  // Detect if this is a Master Playlist or a Media Playlist
  const isMasterPlaylist = content.includes('#EXT-X-STREAM-INF');

  let cleanContent;

  if (isMasterPlaylist) {
    // MASTER PLAYLIST: Keep all quality levels, rewrite sub-playlist URLs THROUGH PROXY
    const lines = content.split('\n');
    const rewrittenLines = lines.map((line) => {
      const trimmed = line.trim();
      // If it's a URL line (not a tag, not empty)
      if (trimmed && !trimmed.startsWith('#')) {
        // Resolve to absolute URL first
        const absoluteUrl = trimmed.startsWith('http')
          ? trimmed
          : new URL(trimmed, baseUrl).toString();
        // Rewrite through proxy so HLS.js or FFmpeg will call us again for this sub-playlist
        return `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}`;
      }
      return line;
    });
    cleanContent = rewrittenLines.join('\n');
  } else {
    // MEDIA PLAYLIST: Filter ads and rewrite URLs
    const lines = content.split('\n');
    const cleanLines = [];
    let skipNext = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Check for ad segments
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

      // Rewrite relative URLs to absolute
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

module.exports = {
  processM3u8Stream,
  AD_KEYWORDS
};
