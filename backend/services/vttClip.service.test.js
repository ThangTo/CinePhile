const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildClipVtt,
  isSubtitleBoilerplate,
  timestampToSeconds,
} = require('./vttClip.service');

test('timestampToSeconds supports VTT timestamps and second values', () => {
  assert.equal(timestampToSeconds('00:31:16.500'), 1876.5);
  assert.equal(timestampToSeconds('01:02:03,250'), 3723.25);
  assert.equal(timestampToSeconds('95'), 95);
});

test('isSubtitleBoilerplate detects common subscribe hallucinations', () => {
  assert.equal(
    isSubtitleBoilerplate('Hay subscribe cho kenh La La School de khong bo lo nhung video hap dan'),
    true,
  );
  assert.equal(isSubtitleBoilerplate('Anh bi kho ha?'), false);
});

test('buildClipVtt extracts only overlapping cues and shifts timestamps to clip start', () => {
  const source = [
    'WEBVTT',
    '',
    '00:31:10.000 --> 00:31:20.000',
    'First line overlaps the clip start.',
    '',
    '00:31:24.000 --> 00:31:30.000',
    'Second line is inside the clip.',
    '',
    '00:32:10.000 --> 00:32:15.000',
    'This line is outside.',
  ].join('\n');

  const result = buildClipVtt(source, '00:31:16', 20);

  assert.equal(result.cueCount, 2);
  assert.match(result.content, /00:00:00\.000 --> 00:00:04\.000/);
  assert.match(result.content, /First line overlaps the clip start/);
  assert.match(result.content, /00:00:08\.000 --> 00:00:14\.000/);
  assert.match(result.content, /Second line is inside the clip/);
  assert.doesNotMatch(result.content, /outside/);
});

test('buildClipVtt drops subscribe boilerplate while keeping dialogue', () => {
  const source = [
    'WEBVTT',
    '',
    '00:00:00.000 --> 00:00:06.000',
    'Hay subscribe cho kenh La La School de khong bo lo nhung video hap dan',
    '',
    '00:00:06.000 --> 00:00:09.000',
    'Anh bi kho ha?',
  ].join('\n');

  const result = buildClipVtt(source, 0, 10);

  assert.equal(result.cueCount, 1);
  assert.doesNotMatch(result.content, /subscribe/);
  assert.match(result.content, /Anh bi kho/);
});
