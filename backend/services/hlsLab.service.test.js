const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertPublicHttpUrlSync,
  buildSnippetResult,
  buildStats,
  normalizeSnippetToPlaylist,
  parseVariantPlaylists,
  pickVariantPlaylist,
  transformPlaylistContent,
} = require('./hlsLab.service');
const { stripOverlaySegmentPrefixes } = require('../utils/m3u8Utils');

test('normalizeSnippetToPlaylist wraps segment snippets in a playable media playlist', () => {
  const content = [
    '/v8/hash/segment_0001.ts',
    '#EXTINF:2.56,',
    '/v8/hash/segment_0002.ts',
  ].join('\n');

  const playlist = normalizeSnippetToPlaylist(content);

  assert.match(playlist, /^#EXTM3U/);
  assert.match(playlist, /#EXT-X-TARGETDURATION:3/);
  assert.match(playlist, /#EXTINF:2\.00,\n\/v8\/hash\/segment_0001\.ts/);
  assert.match(playlist, /#EXT-X-ENDLIST$/);
});

test('transformPlaylistContent removes current production ad keyword matches', () => {
  const content = [
    '#EXTM3U',
    '#EXTINF:3.0,',
    '/movie/segment_0001.ts',
    '#EXTINF:2.0,',
    '/v7/ad.ts',
    '#EXTINF:3.0,',
    '/movie/segment_0002.ts',
  ].join('\n');

  const filtered = transformPlaylistContent(content, {
    baseUrl: 'https://cdn.example.com/video/index.m3u8',
    filterAds: true,
    segmentMode: 'direct',
  });

  assert.match(filtered, /https:\/\/cdn\.example\.com\/movie\/segment_0001\.ts/);
  assert.doesNotMatch(filtered, /\/v7\/ad\.ts/);
  assert.match(filtered, /https:\/\/cdn\.example\.com\/movie\/segment_0002\.ts/);
});

test('transformPlaylistContent strips overlay prefixes without dropping the segment', () => {
  const content = [
    '#EXTM3U',
    '#EXT-X-DISCONTINUITY',
    '#EXTINF:2.32,',
    'convertv8/BC3F2R4R.ts',
    '#EXT-X-DISCONTINUITY',
    '#EXTINF:4.0,',
    'movie/segment_0001.ts',
  ].join('\n');

  const currentFilter = transformPlaylistContent(content, {
    baseUrl: 'https://cdn.example.com/show/playlist.m3u8',
    filterAds: true,
    segmentMode: 'direct',
  });

  assert.doesNotMatch(currentFilter, /convertv8\/BC3F2R4R\.ts/);
  assert.match(currentFilter, /https:\/\/cdn\.example\.com\/show\/BC3F2R4R\.ts/);
  assert.match(currentFilter, /movie\/segment_0001\.ts/);
});

test('buildSnippetResult returns direct preview playlists by default and suspicious stats', () => {
  const result = buildSnippetResult({
    content: [
      '#EXTINF:2.32,',
      'convertv8/BC3F2R4R.ts',
      '#EXTINF:4.0,',
      'movie/segment_0001.ts',
    ].join('\n'),
    baseUrl: 'https://cdn.example.com/show/index.m3u8',
    tsProxyBase: 'https://api.example.com/api/v1/movies/proxy-ts',
  });

  assert.equal(result.rawStats.segmentCount, 2);
  assert.equal(result.filteredStats.segmentCount, 2);
  assert.equal(result.previewSegmentMode, 'direct');
  assert.match(result.previewRawContent, /https:\/\/cdn\.example\.com\/show\/convertv8\/BC3F2R4R\.ts/);
  assert.match(result.previewFilteredContent, /https:\/\/cdn\.example\.com\/show\/BC3F2R4R\.ts/);
  assert.doesNotMatch(result.previewFilteredContent, /convertv8\/BC3F2R4R/);
});

test('buildSnippetResult can proxy preview playlists when explicitly requested', () => {
  const result = buildSnippetResult({
    content: [
      '#EXTINF:2.32,',
      'convertv8/BC3F2R4R.ts',
    ].join('\n'),
    baseUrl: 'https://cdn.example.com/show/index.m3u8',
    segmentMode: 'proxy',
    tsProxyBase: 'https://api.example.com/api/v1/movies/proxy-ts',
  });

  assert.equal(result.previewSegmentMode, 'proxy');
  assert.match(result.previewRawContent, /convertv8%2FBC3F2R4R\.ts/);
  assert.match(result.previewFilteredContent, /proxy-ts\?url=https%3A%2F%2Fcdn\.example\.com%2Fshow%2FBC3F2R4R\.ts/);
});

test('stripOverlaySegmentPrefixes keeps the segment while removing known overlay folders', () => {
  assert.equal(
    stripOverlaySegmentPrefixes('https://cdn.example.com/show/convertv8/BC3F2R4R.ts'),
    'https://cdn.example.com/show/BC3F2R4R.ts',
  );
  assert.equal(
    stripOverlaySegmentPrefixes('https://cdn.example.com/show/movie/segment_0001.ts'),
    'https://cdn.example.com/show/movie/segment_0001.ts',
  );
});

test('buildStats reports discontinuities and suspicious segments', () => {
  const stats = buildStats([
    '#EXTM3U',
    '#EXT-X-DISCONTINUITY',
    '#EXTINF:2.32,',
    'convertv8/BC3F2R4R.ts',
  ].join('\n'));

  assert.equal(stats.discontinuityCount, 1);
  assert.equal(stats.suspiciousCount, 1);
  assert.deepEqual(stats.suspiciousSegments[0].reasons.includes('convert-path'), true);
});

test('assertPublicHttpUrlSync rejects private snippet bases', () => {
  assert.throws(() => assertPublicHttpUrlSync('http://127.0.0.1/private.m3u8'), /not allowed/);
  assert.equal(
    assertPublicHttpUrlSync('https://cdn.example.com/video/index.m3u8'),
    'https://cdn.example.com/video/index.m3u8',
  );
});

test('parseVariantPlaylists resolves media playlists and picks the highest bandwidth', () => {
  const master = [
    '#EXTM3U',
    '#EXT-X-STREAM-INF:BANDWIDTH=1800000,RESOLUTION=1280x720',
    '1800kb/hls/index.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=3500000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"',
    '3500kb/hls/index.m3u8',
  ].join('\n');

  const variants = parseVariantPlaylists(master, 'https://v7.kkphimplayer7.com/20260422/PF9CynBn/');
  const best = pickVariantPlaylist(variants);

  assert.equal(variants.length, 2);
  assert.equal(best.bandwidth, 3500000);
  assert.equal(
    best.uri,
    'https://v7.kkphimplayer7.com/20260422/PF9CynBn/3500kb/hls/index.m3u8',
  );
});
