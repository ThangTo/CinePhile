const test = require('node:test');
const assert = require('node:assert/strict');

const registry = require('./registry');

test('registry resolves openrouter provider', () => {
  const provider = registry.resolve('openrouter');
  assert.equal(provider.name, 'openrouter');
});

test('registry resolves gemini provider', () => {
  const provider = registry.resolve('gemini');
  assert.equal(provider.name, 'gemini');
});

test('registry resolves openai provider', () => {
  const provider = registry.resolve('openai');
  assert.equal(provider.name, 'openai');
});

test('registry resolves compatible provider', () => {
  const provider = registry.resolve('compatible');
  assert.equal(provider.name, 'compatible');
});

test('registry resolves custom provider', () => {
  const provider = registry.resolve('custom');
  assert.equal(provider.name, 'custom');
});

test('registry throws for unknown provider', () => {
  assert.throws(
    () => registry.resolve('anthropic'),
    /not registered/,
  );
});

test('registry has returns boolean', () => {
  assert.equal(registry.has('openrouter'), true);
  assert.equal(registry.has('anthropic'), false);
});
