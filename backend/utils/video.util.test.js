const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateProgressPercent,
  parseTimemarkToSeconds,
} = require('./video.util');

test('parseTimemarkToSeconds converts ffmpeg timemark to seconds', () => {
  assert.equal(parseTimemarkToSeconds('00:00:10.50'), 10.5);
  assert.equal(parseTimemarkToSeconds('01:02:03.25'), 3723.25);
});

test('calculateProgressPercent clamps progress between bounds', () => {
  assert.equal(calculateProgressPercent(25, 100, 5, 99), 25);
  assert.equal(calculateProgressPercent(0, 100, 5, 99), 5);
  assert.equal(calculateProgressPercent(150, 100, 5, 99), 99);
});

test('calculateProgressPercent returns null without a usable total duration', () => {
  assert.equal(calculateProgressPercent(10, 0), null);
  assert.equal(calculateProgressPercent(10, Number.NaN), null);
});
