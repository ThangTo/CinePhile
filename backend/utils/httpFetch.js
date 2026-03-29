const dns = require('dns');
const http = require('http');
const https = require('https');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const DEFAULT_TIMEOUT_MS = Math.max(1000, Number(process.env.UPSTREAM_FETCH_TIMEOUT_MS || 15000));
const SOURCE_TLS_MIN_VERSION = process.env.SOURCE_TLS_MIN_VERSION || 'TLSv1.2';
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

function ipv4Lookup(hostname, options, callback) {
  const lookupOptions =
    typeof options === 'object' && options !== null ? options : {};

  return dns.lookup(
    hostname,
    {
      ...lookupOptions,
      family: 4,
      all: false,
      verbatim: false,
    },
    callback,
  );
}

const httpAgent = new http.Agent({
  keepAlive: true,
  family: 4,
  lookup: ipv4Lookup,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  family: 4,
  lookup: ipv4Lookup,
  minVersion: SOURCE_TLS_MIN_VERSION,
});

function getIpv4Agent(parsedUrl) {
  return parsedUrl.protocol === 'http:' ? httpAgent : httpsAgent;
}

function getHttpAgent() {
  return httpAgent;
}

function getHttpsAgent() {
  return httpsAgent;
}

function buildSourceHeaders(url, overrides = {}) {
  const headers = {
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': DEFAULT_USER_AGENT,
    ...overrides,
  };

  try {
    const parsedUrl = new URL(url);
    headers.Origin = headers.Origin || parsedUrl.origin;
    headers.Referer = headers.Referer || `${parsedUrl.origin}/`;
  } catch (_error) {
    // Leave headers as-is for invalid URLs; the caller will surface the real error.
  }

  return headers;
}

async function fetchWithIpv4(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...rest } = options;
  const controller = new AbortController();
  let removeAbortListener = null;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (typeof timeout.unref === 'function') {
    timeout.unref();
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      const onAbort = () => controller.abort(externalSignal.reason);
      externalSignal.addEventListener('abort', onAbort, { once: true });
      removeAbortListener = () => externalSignal.removeEventListener('abort', onAbort);
    }
  }

  try {
    return await fetch(url, {
      ...rest,
      agent: rest.agent || getIpv4Agent,
      signal: controller.signal,
    });
  } finally {
    if (removeAbortListener) {
      removeAbortListener();
    }
    clearTimeout(timeout);
  }
}

module.exports = {
  SOURCE_TLS_MIN_VERSION,
  buildSourceHeaders,
  fetchWithIpv4,
  getHttpAgent,
  getHttpsAgent,
  getIpv4Agent,
};
