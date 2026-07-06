const test = require('node:test');
const assert = require('node:assert/strict');

const { getTaskDefaults, TASKS } = require('./tasks');

test('getTaskDefaults returns TIMI config', () => {
  const task = getTaskDefaults('TIMI');
  assert.equal(task.timeoutMs, 10000);
  assert.equal(task.title, 'CinePhine Timi Assistant');
  assert.equal(task.modelByProvider.gemini, 'gemini-2.5-flash');
  assert.equal(task.modelByProvider.default, 'google/gemini-2.5-flash');
});

test('getTaskDefaults returns VIRAL config', () => {
  const task = getTaskDefaults('VIRAL');
  assert.equal(task.timeoutMs, 60000);
  assert.equal(task.modelByProvider.default, 'google/gemini-2.0-flash-001');
});

test('getTaskDefaults returns MODERATION config', () => {
  const task = getTaskDefaults('MODERATION');
  assert.equal(task.timeoutMs, 15000);
  assert.equal(task.modelByProvider.default, 'openai/gpt-4o-mini');
});

test('getTaskDefaults returns TRENDING config', () => {
  const task = getTaskDefaults('TRENDING');
  assert.equal(task.timeoutMs, 30000);
  assert.equal(task.referer, 'https://cinephine.io.vn');
});

test('getTaskDefaults returns CHATBOT config', () => {
  const task = getTaskDefaults('CHATBOT');
  assert.equal(task.title, 'CinePhine Chatbot');
  assert.ok(Array.isArray(task.openrouterFallback));
});

test('getTaskDefaults returns CHATBOT_INTENT config', () => {
  const task = getTaskDefaults('CHATBOT_INTENT');
  assert.equal(task.modelByProvider.default, 'openai/gpt-4o-mini');
});

test('getTaskDefaults returns empty for unknown scope', () => {
  const task = getTaskDefaults('UNKNOWN');
  assert.deepEqual(task, {});
});

test('getTaskDefaults returns empty for no scope', () => {
  const task = getTaskDefaults();
  assert.deepEqual(task, {});
});
