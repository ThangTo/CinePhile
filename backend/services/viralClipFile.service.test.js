const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  VIRAL_CLIP_ROOT,
  buildClipUrl,
  getClipFileInfo,
  resolveViralClipPath,
} = require('./viralClipFile.service');

test('buildClipUrl creates a browser-safe viral clip route', () => {
  assert.equal(
    buildClipUrl('movie id', 'funny_00:01:02.mp4'),
    '/api/v1/viral-clips/file/movie%20id/funny_00%3A01%3A02.mp4',
  );
});

test('getClipFileInfo maps an output path to clip metadata', () => {
  const outputPath = path.join(VIRAL_CLIP_ROOT, 'movie123', 'funny_00-01-02.mp4');
  const info = getClipFileInfo(outputPath);

  assert.equal(info.movieId, 'movie123');
  assert.equal(info.fileName, 'funny_00-01-02.mp4');
  assert.equal(info.url, '/api/v1/viral-clips/file/movie123/funny_00-01-02.mp4');
  assert.equal(info.exists, false);
});

test('getClipFileInfo rejects paths outside viral clip output root', () => {
  assert.equal(getClipFileInfo(path.join(__dirname, '..', 'server.js')), null);
});

test('resolveViralClipPath resolves safe movie and file params', () => {
  assert.equal(
    resolveViralClipPath('movie123', 'clip.mp4'),
    path.join(VIRAL_CLIP_ROOT, 'movie123', 'clip.mp4'),
  );
});

test('resolveViralClipPath rejects traversal and non-mp4 files', () => {
  assert.throws(() => resolveViralClipPath('../movie', 'clip.mp4'), /Invalid viral clip path/);
  assert.throws(() => resolveViralClipPath('movie', '..\\clip.mp4'), /Invalid viral clip path/);
  assert.throws(() => resolveViralClipPath('movie', 'clip.txt'), /Invalid viral clip file type/);
});
