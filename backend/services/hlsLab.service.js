const dns = require('dns').promises;
const net = require('net');
const { buildSourceHeaders, fetchWithIpv4 } = require('../utils/httpFetch');
const {
  AD_KEYWORDS,
  appendQueryParams,
  stripOverlaySegmentPrefixes,
} = require('../utils/m3u8Utils');

const MAX_PLAYLIST_BYTES = Math.max(
  128 * 1024,
  Number(process.env.HLS_LAB_MAX_PLAYLIST_BYTES || 2 * 1024 * 1024),
);
const FETCH_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.HLS_LAB_FETCH_TIMEOUT_MS || 20000),
);
const DEFAULT_EXTINF_SECONDS = 2;
const BUILTIN_SUSPICIOUS_PATTERNS = [
  ...AD_KEYWORDS,
  '/v8/',
  'convertv7/',
  'convertv8/',
  '/ads/',
  '/ad/',
];

function parsePatternList(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(raw.map((item) => String(item || '').trim()).filter(Boolean))];
}

function uniquePatterns(...groups) {
  return [...new Set(groups.flatMap(parsePatternList))];
}

function normalizeHostname(hostname = '') {
  return String(hostname).trim().toLowerCase().replace(/^\[|\]$/g, '');
}

function isPrivateIp(ip) {
  const version = net.isIP(ip);
  if (!version) return false;

  if (version === 6) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
  }

  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

async function assertPublicHttpUrl(rawUrl, label = 'url') {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch (_error) {
    throw new Error(`${label} is not a valid URL`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https`);
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error(`${label} host is not allowed`);
  }

  if (isPrivateIp(hostname)) {
    throw new Error(`${label} private IP is not allowed`);
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (addresses.some((entry) => isPrivateIp(entry.address))) {
      throw new Error(`${label} resolves to a private IP`);
    }
  } catch (error) {
    if (error.message.includes('private IP')) throw error;
    throw new Error(`${label} host could not be resolved`);
  }

  return parsed.toString();
}

function assertPublicHttpUrlSync(rawUrl, label = 'url') {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch (_error) {
    throw new Error(`${label} is not a valid URL`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https`);
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || isPrivateIp(hostname)) {
    throw new Error(`${label} host is not allowed`);
  }

  return parsed.toString();
}

function ensureContentSize(content, label = 'playlist') {
  const size = Buffer.byteLength(String(content || ''), 'utf8');
  if (size > MAX_PLAYLIST_BYTES) {
    throw new Error(`${label} is too large (${size} bytes)`);
  }
}

async function fetchPlaylistText(url) {
  const safeUrl = await assertPublicHttpUrl(url, 'playlist URL');
  const response = await fetchWithIpv4(safeUrl, {
    headers: buildSourceHeaders(safeUrl),
    timeoutMs: FETCH_TIMEOUT_MS,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_PLAYLIST_BYTES) {
    throw new Error(`playlist is too large (${contentLength} bytes)`);
  }

  const content = await response.text();
  ensureContentSize(content);
  return { url: safeUrl, content };
}

function isMasterPlaylist(content = '') {
  return String(content).includes('#EXT-X-STREAM-INF');
}

function parseAttributeList(line = '') {
  const attributes = {};
  const source = String(line).replace(/^#EXT-X-STREAM-INF:/i, '');
  const regex = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/gi;
  let match;

  while ((match = regex.exec(source))) {
    const key = match[1].toLowerCase();
    const rawValue = match[2] || '';
    attributes[key] = rawValue.replace(/^"|"$/g, '');
  }

  return attributes;
}

function parseVariantPlaylists(content = '', baseUrl = '') {
  const lines = String(content || '').split(/\r?\n/);
  const variants = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!/^#EXT-X-STREAM-INF:/i.test(line)) continue;

    let uri = '';
    for (let j = i + 1; j < lines.length; j++) {
      const nextLine = lines[j].trim();
      if (!nextLine || nextLine.startsWith('#')) continue;
      uri = nextLine;
      break;
    }

    if (!uri) continue;

    const attributes = parseAttributeList(line);
    variants.push({
      index: variants.length,
      uri: resolveUri(uri, baseUrl),
      rawUri: uri,
      bandwidth: Number(attributes.bandwidth || 0),
      resolution: attributes.resolution || '',
      codecs: attributes.codecs || '',
      name: attributes.name || '',
    });
  }

  return variants;
}

function pickVariantPlaylist(variants = [], preferredUrl = '') {
  if (!variants.length) return null;
  const preferred = String(preferredUrl || '').trim();
  if (preferred) {
    const matched = variants.find((variant) => variant.uri === preferred || variant.rawUri === preferred);
    if (matched) return matched;
  }

  return [...variants].sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))[0];
}

function isUriLine(line = '') {
  const trimmed = String(line).trim();
  return Boolean(trimmed && !trimmed.startsWith('#'));
}

function parseExtinfDuration(line = '') {
  const match = String(line).match(/^#EXTINF:([\d.]+)/i);
  return match ? Number(match[1]) : null;
}

function getTargetDuration(lines) {
  const maxDuration = lines.reduce((max, line) => {
    const duration = parseExtinfDuration(line);
    return Number.isFinite(duration) ? Math.max(max, duration) : max;
  }, DEFAULT_EXTINF_SECONDS);
  return Math.max(1, Math.ceil(maxDuration));
}

function normalizeSnippetToPlaylist(content) {
  const originalLines = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (originalLines.length === 0) {
    throw new Error('snippet content is empty');
  }

  const hasHeader = originalLines[0] === '#EXTM3U';
  const bodyLines = hasHeader ? originalLines.slice(1) : originalLines;
  const targetDuration = getTargetDuration(bodyLines);
  const normalized = hasHeader
    ? ['#EXTM3U']
    : ['#EXTM3U', '#EXT-X-VERSION:3', `#EXT-X-TARGETDURATION:${targetDuration}`, '#EXT-X-MEDIA-SEQUENCE:0'];

  let previousWasInf = false;
  for (const line of bodyLines) {
    if (line === '#EXTM3U') continue;
    if (isUriLine(line) && !previousWasInf) {
      normalized.push(`#EXTINF:${DEFAULT_EXTINF_SECONDS.toFixed(2)},`);
    }
    normalized.push(line);
    previousWasInf = /^#EXTINF:/i.test(line);
    if (!isUriLine(line) && !/^#EXTINF:/i.test(line)) {
      previousWasInf = false;
    }
  }

  if (!normalized.some((line) => line.toUpperCase() === '#EXT-X-ENDLIST')) {
    normalized.push('#EXT-X-ENDLIST');
  }

  return normalized.join('\n');
}

function resolveUri(uri, baseUrl) {
  const value = String(uri || '').trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (!baseUrl) return value;
  return new URL(value, baseUrl).toString();
}

function matchesPattern(uri, patterns) {
  const lower = String(uri || '').toLowerCase();
  return parsePatternList(patterns).some((pattern) => lower.includes(String(pattern).toLowerCase()));
}

function getSegmentReasons(uri, patterns = BUILTIN_SUSPICIOUS_PATTERNS) {
  const lower = String(uri || '').toLowerCase();
  const reasons = [];
  for (const pattern of parsePatternList(patterns)) {
    if (lower.includes(String(pattern).toLowerCase())) {
      reasons.push(`pattern:${pattern}`);
    }
  }
  if (/\/v\d+\//i.test(uri)) reasons.push('versioned-path');
  if (/\/?convertv\d+\//i.test(uri)) reasons.push('convert-path');
  if (/\/[a-z0-9]{8,12}\.ts(?:\?|$)/i.test(uri)) reasons.push('random-ts-name');
  return [...new Set(reasons)];
}

function buildStats(content, options = {}) {
  const lines = String(content || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let lastDuration = null;
  let totalDuration = 0;
  const segments = [];
  const suspiciousSegments = [];
  const prefixCounts = new Map();
  const patterns = uniquePatterns(BUILTIN_SUSPICIOUS_PATTERNS, options.extraPatterns);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const duration = parseExtinfDuration(line);
    if (Number.isFinite(duration)) {
      lastDuration = duration;
      totalDuration += duration;
      continue;
    }

    if (!isUriLine(line)) continue;

    const reasons = getSegmentReasons(line, patterns);
    const prefix = line.split('/').slice(0, -1).join('/') || '(root)';
    prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
    const segment = {
      lineNumber: i + 1,
      uri: line,
      duration: lastDuration,
      reasons,
    };
    segments.push(segment);
    if (reasons.length > 0) suspiciousSegments.push(segment);
    lastDuration = null;
  }

  return {
    isMaster: isMasterPlaylist(content),
    lineCount: lines.length,
    segmentCount: segments.length,
    extinfCount: lines.filter((line) => /^#EXTINF:/i.test(line)).length,
    discontinuityCount: lines.filter((line) => line.toUpperCase() === '#EXT-X-DISCONTINUITY').length,
    totalDuration: Number(totalDuration.toFixed(3)),
    suspiciousCount: suspiciousSegments.length,
    suspiciousSegments: suspiciousSegments.slice(0, 80),
    topPrefixes: [...prefixCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([prefix, count]) => ({ prefix, count })),
  };
}

function rewriteUri(uri, options = {}) {
  const absoluteUrl = resolveUri(uri, options.baseUrl);
  if (options.segmentMode === 'proxy' && options.tsProxyBase && /^https?:\/\//i.test(absoluteUrl)) {
    return appendQueryParams(options.tsProxyBase, { url: absoluteUrl });
  }
  return absoluteUrl;
}

function normalizeSegmentMode(value) {
  return value === 'proxy' ? 'proxy' : 'direct';
}

function rewritePlaylistUri(uri, options = {}) {
  const absoluteUrl = resolveUri(uri, options.baseUrl);
  if (options.playlistProxyBase && /^https?:\/\//i.test(absoluteUrl)) {
    return appendQueryParams(options.playlistProxyBase, {
      url: absoluteUrl,
      variant: options.variant || 'raw',
      segmentMode: normalizeSegmentMode(options.segmentMode),
      patterns: parsePatternList(options.extraPatterns).join(','),
    });
  }
  return absoluteUrl;
}

function transformPlaylistContent(content, options = {}) {
  const lines = String(content || '').split(/\r?\n/);
  const cleanLines = [];
  const patterns = uniquePatterns(AD_KEYWORDS, options.extraPatterns);
  const shouldFilter = Boolean(options.filterAds);
  const master = isMasterPlaylist(content);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    let line = rawLine.trim();
    if (!line) continue;

    if (master && isUriLine(line)) {
      cleanLines.push(rewritePlaylistUri(line, options));
      continue;
    }

    if (shouldFilter && /^#EXTINF:/i.test(line)) {
      const nextLine = (lines[i + 1] || '').trim();
      if (isUriLine(nextLine) && matchesPattern(nextLine, patterns)) {
        i += 1;
        continue;
      }
    }

    if (isUriLine(line)) {
      let segmentUrl = resolveUri(line, options.baseUrl);
      if (shouldFilter) {
        segmentUrl = stripOverlaySegmentPrefixes(segmentUrl);
      }
      line = options.segmentMode === 'proxy'
        ? rewriteUri(segmentUrl, options)
        : segmentUrl;
    }

    cleanLines.push(line);
  }

  return cleanLines.join('\n');
}

function buildSnippetResult({ content, baseUrl, extraPatterns, segmentMode, tsProxyBase }) {
  ensureContentSize(content, 'snippet');
  const normalizedBaseUrl = baseUrl ? assertPublicHttpUrlSync(baseUrl, 'snippet base URL') : '';
  const previewSegmentMode = normalizeSegmentMode(segmentMode);
  const rawContent = normalizeSnippetToPlaylist(content);
  const filteredContent = transformPlaylistContent(rawContent, {
    baseUrl: normalizedBaseUrl,
    filterAds: true,
    extraPatterns,
    segmentMode: 'direct',
  });
  const previewRawContent = transformPlaylistContent(rawContent, {
    baseUrl: normalizedBaseUrl,
    filterAds: false,
    segmentMode: previewSegmentMode,
    tsProxyBase,
  });
  const previewFilteredContent = transformPlaylistContent(rawContent, {
    baseUrl: normalizedBaseUrl,
    filterAds: true,
    extraPatterns,
    segmentMode: previewSegmentMode,
    tsProxyBase,
  });

  return {
    rawContent,
    filteredContent,
    previewRawContent,
    previewFilteredContent,
    previewSegmentMode,
    rawStats: buildStats(rawContent, { extraPatterns }),
    filteredStats: buildStats(filteredContent, { extraPatterns }),
  };
}

async function resolvePlayablePlaylist(url, options = {}) {
  const first = await fetchPlaylistText(url);
  const firstBaseUrl = first.url.substring(0, first.url.lastIndexOf('/') + 1);

  if (!isMasterPlaylist(first.content)) {
    return {
      originalUrl: first.url,
      sourceUrl: first.url,
      baseUrl: firstBaseUrl,
      content: first.content,
      masterContent: null,
      variants: [],
      selectedVariant: null,
      resolvedFromMaster: false,
    };
  }

  const variants = parseVariantPlaylists(first.content, firstBaseUrl);
  const selectedVariant = pickVariantPlaylist(variants, options.variantUrl);
  if (!selectedVariant) {
    return {
      originalUrl: first.url,
      sourceUrl: first.url,
      baseUrl: firstBaseUrl,
      content: first.content,
      masterContent: first.content,
      variants,
      selectedVariant: null,
      resolvedFromMaster: false,
    };
  }

  const media = await fetchPlaylistText(selectedVariant.uri);
  const mediaBaseUrl = media.url.substring(0, media.url.lastIndexOf('/') + 1);

  return {
    originalUrl: first.url,
    sourceUrl: media.url,
    baseUrl: mediaBaseUrl,
    content: media.content,
    masterContent: first.content,
    variants,
    selectedVariant,
    resolvedFromMaster: true,
  };
}

async function inspectSourceUrl(url, options = {}) {
  const resolved = await resolvePlayablePlaylist(url, options);
  const filteredContent = transformPlaylistContent(resolved.content, {
    baseUrl: resolved.baseUrl,
    filterAds: true,
    segmentMode: 'direct',
    extraPatterns: options.extraPatterns,
  });

  return {
    originalUrl: resolved.originalUrl,
    sourceUrl: resolved.sourceUrl,
    baseUrl: resolved.baseUrl,
    masterContent: resolved.masterContent,
    variants: resolved.variants,
    selectedVariant: resolved.selectedVariant,
    resolvedFromMaster: resolved.resolvedFromMaster,
    rawContent: resolved.content,
    filteredContent,
    rawStats: buildStats(resolved.content, { extraPatterns: options.extraPatterns }),
    filteredStats: buildStats(filteredContent, { extraPatterns: options.extraPatterns }),
  };
}

async function buildPreviewPlaylistFromUrl(url, options = {}) {
  const resolved = await resolvePlayablePlaylist(url, options);
  const variant = options.variant === 'filtered' ? 'filtered' : 'raw';
  return transformPlaylistContent(resolved.content, {
    baseUrl: resolved.baseUrl,
    filterAds: variant === 'filtered',
    extraPatterns: options.extraPatterns,
    segmentMode: normalizeSegmentMode(options.segmentMode),
    tsProxyBase: options.tsProxyBase,
    playlistProxyBase: options.playlistProxyBase,
    variant,
  });
}

module.exports = {
  assertPublicHttpUrl,
  assertPublicHttpUrlSync,
  buildPreviewPlaylistFromUrl,
  buildSnippetResult,
  buildStats,
  inspectSourceUrl,
  normalizeSnippetToPlaylist,
  normalizeSegmentMode,
  parseAttributeList,
  parsePatternList,
  parseVariantPlaylists,
  pickVariantPlaylist,
  resolvePlayablePlaylist,
  transformPlaylistContent,
};
