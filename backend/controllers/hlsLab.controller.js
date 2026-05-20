const {
  buildPreviewPlaylistFromUrl,
  buildSnippetResult,
  inspectSourceUrl,
  parsePatternList,
} = require('../services/hlsLab.service');

function getRequestOrigin(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = req.get('host');
  let protocol = forwardedProto || req.protocol;

  if (protocol === 'http' && host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    protocol = 'https';
  }

  return `${protocol}://${host}`;
}

function getProxyBases(req) {
  const origin = getRequestOrigin(req);
  return {
    playlistProxyBase: `${origin}${req.baseUrl || ''}/hls-lab/playlist`,
    tsProxyBase: `${origin}/api/v1/movies/proxy-ts`,
  };
}

function sendError(res, error) {
  const message = error?.message || 'HLS lab request failed';
  const status = /not allowed|private IP|valid URL|too large|empty|required/i.test(message) ? 400 : 502;
  return res.status(status).json({ success: false, message });
}

async function inspectPlaylist(req, res) {
  try {
    const { url, patterns, variantUrl } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Missing url parameter' });
    }

    const result = await inspectSourceUrl(url, {
      extraPatterns: parsePatternList(patterns),
      variantUrl,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[hlsLab.inspectPlaylist]', error.message);
    return sendError(res, error);
  }
}

async function previewPlaylist(req, res) {
  try {
    const { url, variant, segmentMode, patterns, variantUrl } = req.query;
    if (!url) {
      return res.status(400).send('Missing url parameter');
    }

    const playlist = await buildPreviewPlaylistFromUrl(url, {
      variant,
      variantUrl,
      segmentMode: segmentMode === 'proxy' ? 'proxy' : 'direct',
      extraPatterns: parsePatternList(patterns),
      ...getProxyBases(req),
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(playlist);
  } catch (error) {
    console.error('[hlsLab.previewPlaylist]', error.message);
    return res.status(502).send(error.message || 'Failed to build preview playlist');
  }
}

async function processSnippet(req, res) {
  try {
    const { content, baseUrl, patterns, segmentMode } = req.body || {};
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing snippet content' });
    }

    const result = buildSnippetResult({
      content,
      baseUrl,
      extraPatterns: parsePatternList(patterns),
      segmentMode: segmentMode === 'proxy' ? 'proxy' : 'direct',
      tsProxyBase: getProxyBases(req).tsProxyBase,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[hlsLab.processSnippet]', error.message);
    return sendError(res, error);
  }
}

module.exports = {
  inspectPlaylist,
  previewPlaylist,
  processSnippet,
};
