const test = require('node:test');
const assert = require('node:assert/strict');

const { isValidEmail, normalizeEmail } = require('./emailUtils');

test('normalizeEmail trims and lowercases email addresses', () => {
  assert.equal(normalizeEmail('  User.Name@Example.COM '), 'user.name@example.com');
  assert.equal(isValidEmail('  User.Name@Example.COM '), true);
});

test('isValidEmail rejects malformed email addresses', () => {
  [
    'plainaddress',
    '@example.com',
    'user@',
    'user@example',
    'user@example.c',
    'user@example.123',
    'user..name@example.com',
    '.user@example.com',
    'user.@example.com',
    'user@example..com',
    'user@-example.com',
    'user@example-.com',
  ].forEach((email) => assert.equal(isValidEmail(email), false, email));
});
