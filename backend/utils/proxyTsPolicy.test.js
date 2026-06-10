const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildProxyTsPolicyHeaders,
  getClientIp,
  getProxyTsPolicy,
  isInternalLoopbackRequest,
  normalizeIpAddress,
} = require('./proxyTsPolicy');

function makeReq({ headers = {}, ip, remoteAddress = '203.0.113.10' } = {}) {
  return {
    headers,
    ip,
    socket: { remoteAddress },
    connection: { remoteAddress },
    get(name) {
      return headers[String(name).toLowerCase()];
    },
  };
}

test('getProxyTsPolicy blocks Vietnam country headers by default', () => {
  const decision = getProxyTsPolicy(
    makeReq({
      headers: {
        host: 'api.example.com',
        'cf-ipcountry': 'VN',
        'cf-connecting-ip': '14.161.1.1',
      },
    }),
    {},
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.policy, 'direct-only');
  assert.equal(decision.country, 'VN');
  assert.equal(decision.reason, 'blocked-country');
});

test('getProxyTsPolicy allows non-Vietnam country headers', () => {
  const decision = getProxyTsPolicy(
    makeReq({
      headers: {
        host: 'api.example.com',
        'cf-ipcountry': 'US',
        'cf-connecting-ip': '8.8.8.8',
      },
    }),
    {},
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.policy, 'proxy-allowed');
  assert.equal(decision.country, 'US');
  assert.equal(decision.reason, 'country-allowed');
});

test('getProxyTsPolicy blocks unknown countries by default', () => {
  const decision = getProxyTsPolicy(
    makeReq({
      headers: {
        host: 'api.example.com',
      },
      remoteAddress: '203.0.113.10',
    }),
    {},
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.policy, 'direct-only');
  assert.equal(decision.country, null);
  assert.equal(decision.reason, 'unknown-country');
});

test('getProxyTsPolicy can allow unknown countries through env override', () => {
  const decision = getProxyTsPolicy(
    makeReq({
      headers: {
        host: 'api.example.com',
      },
      remoteAddress: '203.0.113.10',
    }),
    { PROXY_TS_ALLOW_UNKNOWN_COUNTRY: 'true' },
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.policy, 'proxy-allowed');
  assert.equal(decision.reason, 'unknown-country-allowed');
});

test('getProxyTsPolicy allows strict internal loopback requests', () => {
  const req = makeReq({
    headers: {
      host: '127.0.0.1:5000',
      'cf-ipcountry': 'VN',
    },
    remoteAddress: '::ffff:127.0.0.1',
  });
  const decision = getProxyTsPolicy(req, {});

  assert.equal(isInternalLoopbackRequest(req), true);
  assert.equal(decision.allowed, true);
  assert.equal(decision.policy, 'proxy-allowed');
  assert.equal(decision.country, 'LOCAL');
  assert.equal(decision.reason, 'internal-loopback');
});

test('isInternalLoopbackRequest rejects proxied loopback sockets with forwarded headers', () => {
  const req = makeReq({
    headers: {
      host: '127.0.0.1:5000',
      'x-forwarded-for': '14.161.1.1',
    },
    remoteAddress: '127.0.0.1',
  });

  assert.equal(isInternalLoopbackRequest(req), false);
});

test('getClientIp normalizes forwarded IPv4 and IPv6 mapped addresses', () => {
  assert.equal(
    getClientIp(
      makeReq({
        headers: {
          host: 'api.example.com',
          'x-forwarded-for': '14.161.1.1, 10.0.0.1',
        },
      }),
    ),
    '14.161.1.1',
  );

  assert.equal(normalizeIpAddress('::ffff:127.0.0.1'), '127.0.0.1');
  assert.equal(normalizeIpAddress('203.0.113.10:443'), '203.0.113.10');
});

test('buildProxyTsPolicyHeaders exposes stable debug headers', () => {
  const headers = buildProxyTsPolicyHeaders({
    policy: 'direct-only',
    country: null,
    reason: 'unknown-country',
  });

  assert.deepEqual(headers, {
    'X-Proxy-TS-Policy': 'direct-only',
    'X-Proxy-TS-Country': 'UNKNOWN',
    'X-Proxy-TS-Reason': 'unknown-country',
  });
});
