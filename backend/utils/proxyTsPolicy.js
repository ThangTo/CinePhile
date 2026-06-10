const geoip = require('geoip-lite');

const DEFAULT_BLOCK_COUNTRIES = 'VN';
const COUNTRY_HEADER_NAMES = ['cf-ipcountry', 'x-vercel-ip-country', 'x-country-code'];
const CLIENT_IP_HEADER_NAMES = ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'];
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function firstHeaderValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getHeader(req, name) {
  const headers = req?.headers || {};
  const direct = headers[name] || headers[name.toLowerCase()];
  if (direct !== undefined) {
    return firstHeaderValue(direct);
  }

  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  return matchedKey ? firstHeaderValue(headers[matchedKey]) : undefined;
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parseCountryList(value, defaultValue) {
  const source = value === undefined || value === null ? defaultValue : value;
  return new Set(
    String(source || '')
      .split(',')
      .map((country) => normalizeCountryCode(country))
      .filter(Boolean),
  );
}

function normalizeCountryCode(value) {
  const rawValue = firstHeaderValue(value);
  const normalized = String(rawValue || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized) || normalized === 'XX') {
    return null;
  }
  return normalized;
}

function normalizeIpAddress(value) {
  let ip = String(firstHeaderValue(value) || '').trim();
  if (!ip || ip.toLowerCase() === 'unknown') {
    return null;
  }

  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  ip = ip.replace(/^"|"$/g, '');

  if (ip.startsWith('::ffff:')) {
    ip = ip.slice('::ffff:'.length);
  }

  if (ip.startsWith('[')) {
    const closeBracketIndex = ip.indexOf(']');
    if (closeBracketIndex !== -1) {
      ip = ip.slice(1, closeBracketIndex);
    }
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.replace(/:\d+$/, '');
  }

  const zoneIndex = ip.indexOf('%');
  if (zoneIndex !== -1) {
    ip = ip.slice(0, zoneIndex);
  }

  return ip || null;
}

function getRemoteSocketIp(req) {
  return normalizeIpAddress(req?.socket?.remoteAddress || req?.connection?.remoteAddress);
}

function getClientIp(req) {
  const headerCandidates = CLIENT_IP_HEADER_NAMES.map((name) => getHeader(req, name));
  const candidates = [
    ...headerCandidates,
    req?.ip,
    req?.socket?.remoteAddress,
    req?.connection?.remoteAddress,
  ];

  for (const candidate of candidates) {
    const ip = normalizeIpAddress(candidate);
    if (ip) {
      return ip;
    }
  }

  return null;
}

function isLoopbackIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  return lower === 'localhost'
    || lower === '::1'
    || lower === '0:0:0:0:0:0:0:1'
    || /^127\./.test(lower);
}

function normalizeHost(value) {
  let host = String(firstHeaderValue(value) || '').trim().toLowerCase();
  if (!host) return null;

  if (host.startsWith('[')) {
    const closeBracketIndex = host.indexOf(']');
    return closeBracketIndex === -1 ? host : host.slice(1, closeBracketIndex);
  }

  return host.replace(/:\d+$/, '');
}

function hasForwardingHeaders(req) {
  return CLIENT_IP_HEADER_NAMES.some((name) => Boolean(getHeader(req, name)))
    || Boolean(getHeader(req, 'forwarded'));
}

function isInternalLoopbackRequest(req) {
  const remoteIp = getRemoteSocketIp(req);
  const host = normalizeHost(getHeader(req, 'host') || req?.get?.('host'));

  return isLoopbackIp(remoteIp)
    && LOOPBACK_HOSTS.has(host)
    && !hasForwardingHeaders(req);
}

function resolveCountryFromHeaders(req) {
  for (const headerName of COUNTRY_HEADER_NAMES) {
    const country = normalizeCountryCode(getHeader(req, headerName));
    if (country) {
      return {
        country,
        source: headerName,
      };
    }
  }

  return {
    country: null,
    source: null,
  };
}

function resolveClientCountry(req, env = process.env) {
  const trustCountryHeaders = parseBoolean(env.PROXY_TS_TRUST_COUNTRY_HEADERS, true);

  if (trustCountryHeaders) {
    const headerResult = resolveCountryFromHeaders(req);
    if (headerResult.country) {
      return {
        ...headerResult,
        ip: getClientIp(req),
      };
    }
  }

  const ip = getClientIp(req);
  const geo = ip ? geoip.lookup(ip) : null;
  const country = normalizeCountryCode(geo?.country);

  return {
    country,
    source: country ? 'geoip-lite' : 'unknown',
    ip,
  };
}

function getProxyTsPolicy(req, env = process.env) {
  const remoteIp = getRemoteSocketIp(req);

  if (isInternalLoopbackRequest(req)) {
    return {
      allowed: true,
      policy: 'proxy-allowed',
      country: 'LOCAL',
      reason: 'internal-loopback',
      ip: remoteIp || getClientIp(req),
      countrySource: 'loopback',
      isInternal: true,
    };
  }

  const { country, source, ip } = resolveClientCountry(req, env);
  const blockCountries = parseCountryList(env.PROXY_TS_BLOCK_COUNTRIES, DEFAULT_BLOCK_COUNTRIES);
  const allowUnknownCountry = parseBoolean(env.PROXY_TS_ALLOW_UNKNOWN_COUNTRY, false);

  if (!country) {
    return {
      allowed: allowUnknownCountry,
      policy: allowUnknownCountry ? 'proxy-allowed' : 'direct-only',
      country: null,
      reason: allowUnknownCountry ? 'unknown-country-allowed' : 'unknown-country',
      ip,
      countrySource: source || 'unknown',
      isInternal: false,
    };
  }

  if (blockCountries.has(country)) {
    return {
      allowed: false,
      policy: 'direct-only',
      country,
      reason: 'blocked-country',
      ip,
      countrySource: source,
      isInternal: false,
    };
  }

  return {
    allowed: true,
    policy: 'proxy-allowed',
    country,
    reason: 'country-allowed',
    ip,
    countrySource: source,
    isInternal: false,
  };
}

function buildProxyTsPolicyHeaders(decision) {
  return {
    'X-Proxy-TS-Policy': decision.policy,
    'X-Proxy-TS-Country': decision.country || 'UNKNOWN',
    'X-Proxy-TS-Reason': decision.reason,
  };
}

module.exports = {
  buildProxyTsPolicyHeaders,
  getClientIp,
  getProxyTsPolicy,
  isInternalLoopbackRequest,
  normalizeCountryCode,
  normalizeIpAddress,
  parseBoolean,
  parseCountryList,
  resolveClientCountry,
};
