const fs = require('fs');
const path = require('path');

const VIRAL_CLIP_ROOT = path.resolve(__dirname, '..', 'temp_output', 'viral_clips');
const VIRAL_CLIP_ROUTE_BASE = '/api/v1/viral-clips/file';

function isPathInside(parentDir, filePath) {
  const relative = path.relative(path.resolve(parentDir), path.resolve(filePath));
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function encodePathPart(value) {
  return encodeURIComponent(String(value));
}

function buildClipUrl(movieId, fileName) {
  return `${VIRAL_CLIP_ROUTE_BASE}/${encodePathPart(movieId)}/${encodePathPart(fileName)}`;
}

function getClipFileInfo(outputPath) {
  if (!outputPath) return null;

  const resolvedPath = path.resolve(outputPath);
  if (!isPathInside(VIRAL_CLIP_ROOT, resolvedPath)) return null;

  const relativePath = path.relative(VIRAL_CLIP_ROOT, resolvedPath);
  const parts = relativePath.split(path.sep).filter(Boolean);
  if (parts.length !== 2) return null;

  const [movieId, fileName] = parts;
  if (!fileName.toLowerCase().endsWith('.mp4')) return null;

  return {
    movieId,
    fileName,
    path: resolvedPath,
    url: buildClipUrl(movieId, fileName),
    exists: fs.existsSync(resolvedPath),
  };
}

function hasPathSeparators(value) {
  return String(value || '').includes('/') || String(value || '').includes('\\');
}

function resolveViralClipPath(movieId, fileName) {
  const safeMovieId = String(movieId || '').trim();
  const safeFileName = String(fileName || '').trim();

  if (!safeMovieId || !safeFileName) {
    throw new Error('Missing viral clip path');
  }

  if (hasPathSeparators(safeMovieId) || hasPathSeparators(safeFileName)) {
    throw new Error('Invalid viral clip path');
  }

  if (!safeFileName.toLowerCase().endsWith('.mp4')) {
    throw new Error('Invalid viral clip file type');
  }

  const movieDir = path.resolve(VIRAL_CLIP_ROOT, safeMovieId);
  const filePath = path.resolve(movieDir, safeFileName);

  if (!isPathInside(VIRAL_CLIP_ROOT, movieDir) || !isPathInside(movieDir, filePath)) {
    throw new Error('Invalid viral clip path');
  }

  return filePath;
}

module.exports = {
  VIRAL_CLIP_ROOT,
  buildClipUrl,
  getClipFileInfo,
  resolveViralClipPath,
};
