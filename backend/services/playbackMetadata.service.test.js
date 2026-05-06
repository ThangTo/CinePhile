const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizePlaybackMetaInput,
  serializePlaybackMeta,
} = require('./playbackMetadata.service');

test('normalizePlaybackMetaInput accepts valid intro and outro ranges', () => {
  const result = normalizePlaybackMetaInput({
    introStartSec: '61.4',
    introEndSec: 123.9,
    outroStartSec: 1320,
    detectionStatus: 'approved',
    source: 'manual',
    confidence: 1.5,
    applyToSeason: true,
  });

  assert.equal(result.playbackMeta.intro.startSec, 61);
  assert.equal(result.playbackMeta.intro.endSec, 124);
  assert.equal(result.playbackMeta.outro.startSec, 1320);
  assert.equal(result.playbackMeta.detection.status, 'approved');
  assert.equal(result.playbackMeta.detection.source, 'manual');
  assert.equal(result.playbackMeta.detection.confidence, 1);
  assert.equal(result.applyToSeason, true);
});

test('normalizePlaybackMetaInput rejects inverted ranges', () => {
  assert.throws(
    () => normalizePlaybackMetaInput({ introStartSec: 120, introEndSec: 90 }),
    /intro end must be greater/i,
  );
});

test('serializePlaybackMeta returns compact public metadata', () => {
  const serialized = serializePlaybackMeta({
    intro: { startSec: 42, endSec: 104, enabled: true },
    outro: { startSec: 1280, enabled: true },
    detection: {
      status: 'detected',
      source: 'auto',
      confidence: 0.87,
      note: 'Matched 3 episode pairs',
      detectedAt: new Date('2026-05-06T00:00:00.000Z'),
      reviewedBy: 'admin-1',
    },
  });

  assert.deepEqual(serialized, {
    introStartSec: 42,
    introEndSec: 104,
    outroStartSec: 1280,
    detectionStatus: 'detected',
    detectionSource: 'auto',
    confidence: 0.87,
    detectionNote: 'Matched 3 episode pairs',
    detectedAt: new Date('2026-05-06T00:00:00.000Z'),
  });
});

test('normalizePlaybackMetaInput accepts no-match detection status', () => {
  const result = normalizePlaybackMetaInput({
    detectionStatus: 'no_match',
    source: 'auto',
    confidence: 0,
    note: 'No common intro detected from 5 sampled episodes',
  });

  assert.equal(result.playbackMeta.detection.status, 'no_match');
  assert.equal(result.playbackMeta.detection.source, 'auto');
  assert.equal(result.playbackMeta.detection.note, 'No common intro detected from 5 sampled episodes');
});
