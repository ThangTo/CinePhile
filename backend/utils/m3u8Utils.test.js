const test = require('node:test');
const assert = require('node:assert/strict');

const { appendQueryParams } = require('./m3u8Utils');

test('appendQueryParams preserves existing query parameters', () => {
  const result = appendQueryParams('https://api.example.com/proxy-ts?sid=session-1', {
    url: 'https://cdn.example.com/video/seg 01.ts',
  });
  const parsed = new URL(result);

  assert.equal(parsed.searchParams.get('sid'), 'session-1');
  assert.equal(parsed.searchParams.get('url'), 'https://cdn.example.com/video/seg 01.ts');
});

test('appendQueryParams overwrites duplicate keys safely', () => {
  const result = appendQueryParams('https://api.example.com/proxy-m3u8?mode=proxy', {
    mode: 'direct',
    url: 'https://cdn.example.com/master.m3u8',
  });
  const parsed = new URL(result);

  assert.equal(parsed.searchParams.get('mode'), 'direct');
  assert.equal(parsed.searchParams.get('url'), 'https://cdn.example.com/master.m3u8');
});
