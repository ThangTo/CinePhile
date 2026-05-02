const test = require('node:test');
const assert = require('node:assert/strict');

process.env.REDIS_URL = '';

const {
  buildAnalysisPipelineStages,
  buildViralAnalysisCachePaths,
  listAudioChunks,
} = require('./analysisQueue.service');

test('buildAnalysisPipelineStages maps global progress to individual stage progress', () => {
  const stages = buildAnalysisPipelineStages(55, 'active');
  const extract = stages.find((stage) => stage.key === 'extract');
  const whisper = stages.find((stage) => stage.key === 'whisper');
  const analyze = stages.find((stage) => stage.key === 'analyze');

  assert.equal(extract.state, 'completed');
  assert.equal(extract.progress, 100);
  assert.equal(whisper.state, 'active');
  assert.equal(whisper.progress, 50);
  assert.equal(analyze.state, 'pending');
  assert.equal(analyze.progress, 0);
});

test('buildAnalysisPipelineStages marks the current stage failed without hiding prior progress', () => {
  const stages = buildAnalysisPipelineStages(44, 'failed');
  const extract = stages.find((stage) => stage.key === 'extract');
  const whisper = stages.find((stage) => stage.key === 'whisper');
  const analyze = stages.find((stage) => stage.key === 'analyze');

  assert.equal(extract.state, 'completed');
  assert.equal(extract.progress, 100);
  assert.equal(whisper.state, 'failed');
  assert.equal(whisper.progress, 13);
  assert.equal(analyze.state, 'pending');
});

test('buildAnalysisPipelineStages completes all analysis stages after the analysis job completes', () => {
  const stages = buildAnalysisPipelineStages(100, 'completed');
  assert.deepEqual(
    stages.map((stage) => [stage.key, stage.state, stage.progress]),
    [
      ['extract', 'completed', 100],
      ['whisper', 'completed', 100],
      ['analyze', 'completed', 100],
      ['enqueue', 'completed', 100],
    ],
  );
});

test('buildViralAnalysisCachePaths creates stable cache paths for the same source', () => {
  const first = buildViralAnalysisCachePaths(
    'http://127.0.0.1:5000/api/v1/movies/proxy-m3u8?url=https%3A%2F%2Fexample.com%2Fmovie.m3u8&mode=direct',
    'auto',
  );
  const second = buildViralAnalysisCachePaths('https://example.com/movie.m3u8', 'auto');

  assert.equal(first.cacheId, second.cacheId);
  assert.match(first.audioDir, /viral_cache/);
  assert.match(first.scenesFile, /scenes\.json$/);
});

test('listAudioChunks returns sorted non-empty mp3 files', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinephine-test-audio-'));

  try {
    fs.writeFileSync(path.join(dir, 'chunk_002.mp3'), 'data');
    fs.writeFileSync(path.join(dir, 'chunk_001.mp3'), 'data');
    fs.writeFileSync(path.join(dir, 'chunk_003.mp3'), '');
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'data');

    assert.deepEqual(
      listAudioChunks(dir).map((filePath) => path.basename(filePath)),
      ['chunk_001.mp3', 'chunk_002.mp3'],
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
