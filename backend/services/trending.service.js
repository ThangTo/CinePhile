require('dotenv').config();
const axios = require('axios');
const Parser = require('rss-parser');
const mongoose = require('mongoose');
const { promisify } = require('util');
const { exec } = require('child_process');

const { connectDB } = require('../config/db/db');
const MovieModel = require('../models/movie.model');
const TrendingMovieModel = require('../models/trending_movie.model');
const crawlerService = require('./crawler.service');
const { slugify } = require('../utils/movieAdminUtils');

const execAsync = promisify(exec);

const rssParser = new Parser({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
  },
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIKTOK_ENABLED = (process.env.TIKTOK_ENABLED || 'true').toLowerCase() !== 'false';
const TIKTOK_WORKER_URL = (process.env.TIKTOK_WORKER_URL || '').trim();
const TIKTOK_WORKER_CMD = (process.env.TIKTOK_WORKER_CMD || '').trim();
const TIKTOK_FETCH_TIMEOUT_MS = Number(process.env.TIKTOK_FETCH_TIMEOUT_MS || 30000);
const TIKTOK_FETCH_RETRIES = Math.max(1, Number(process.env.TIKTOK_FETCH_RETRIES || 2));
const TIKTOK_TRENDING_COUNT = Math.max(1, Number(process.env.TIKTOK_TRENDING_COUNT || 30));
const TIKTOK_TMDB_SEARCH_LIMIT = Math.max(1, Number(process.env.TIKTOK_TMDB_SEARCH_LIMIT || 10));
const AUTO_CRAWL_LIMIT = Math.max(0, Number(process.env.TRENDING_AUTO_CRAWL_LIMIT || 6));

const GENERIC_TRENDING_TERMS = new Set([
  'phim',
  'movie',
  'series',
  'review',
  'trailer',
  'vietsub',
  'thuyet minh',
  'tap',
  'episode',
  'full',
  'clip',
  'hot',
  'trend',
]);

const LOG_ICONS = {
  pipeline: '🚀',
  tiktok: '🎵',
  tmdb: '🎬',
  google: '📈',
  match: '🔎',
  shortlist: '📋',
  llm: '🤖',
  final: '💾',
  crawl: '🕷️',
  fallback: '🛟',
  miss: '⚪',
  ok: '✅',
  warn: '⚠️',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value = '') {
  return String(value)
    .replace(/d/g, 'd')
    .replace(/Ð/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSlug(value = '') {
  return slugify(normalizeText(value));
}

function toNumber(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(toNumber(value, 0) * factor) / factor;
}

function isUsefulKeyword(keyword = '') {
  const normalized = normalizeText(keyword);
  if (!normalized || normalized.length < 4) return false;
  return !GENERIC_TRENDING_TERMS.has(normalized);
}

function mergeUniqueStrings(...lists) {
  const seen = new Set();
  const merged = [];

  lists
    .flat()
    .forEach((item) => {
      const raw = String(item || '').trim();
      if (!raw) return;
      const key = normalizeText(raw);
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(raw);
    });

  return merged;
}

function aggregateKeywordEntries(entries = []) {
  const aggregated = new Map();

  entries.forEach((entry) => {
    const rawKeyword =
      typeof entry === 'string'
        ? entry
        : entry?.keyword || entry?.raw || entry?.normalized || entry?.label || '';

    if (!isUsefulKeyword(rawKeyword)) return;

    const normalized = normalizeText(rawKeyword);
    const current = aggregated.get(normalized) || {
      keyword: String(rawKeyword).trim(),
      normalized,
      score: 0,
      sources: [],
      videoCount: 0,
    };

    current.score += Math.max(1, toNumber(entry?.score, 1));
    current.videoCount = Math.max(current.videoCount, toNumber(entry?.videoCount, 0));
    current.sources = mergeUniqueStrings(current.sources, [entry?.source || 'unknown']);

    aggregated.set(normalized, current);
  });

  return Array.from(aggregated.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.keyword.length - a.keyword.length;
  });
}

function mapTMDBItem(item = {}, extra = {}) {
  return {
    tmdb_id: item.id,
    tmdb_type: item.media_type === 'tv' || extra.tmdb_type === 'tv' ? 'tv' : 'movie',
    title: item.title || item.name || '',
    original_title: item.original_title || item.original_name || '',
    poster_url: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : '',
    thumb_url: item.backdrop_path ? `${TMDB_IMG}${item.backdrop_path}` : '',
    overview: item.overview || '',
    popularity: toNumber(item.popularity, 0),
    vote_average: toNumber(item.vote_average, 0),
    release_date: item.release_date || item.first_air_date || '',
    search_origin: extra.search_origin || 'tmdb_trending',
    tiktok_keywords: mergeUniqueStrings(extra.tiktok_keywords || []),
  };
}

function normalizeTikTokPayload(payload = {}) {
  const rawVideos = Array.isArray(payload.videos) ? payload.videos : [];
  const normalizedVideos = rawVideos.map((video) => ({
    desc: String(video?.desc || '').trim(),
    author: String(video?.author || '').trim(),
    hashtags: Array.isArray(video?.hashtags) ? mergeUniqueStrings(video.hashtags) : [],
    stats: video?.stats || {},
    createTime: video?.createTime || null,
    raw_title_candidates: Array.isArray(video?.raw_title_candidates)
      ? mergeUniqueStrings(video.raw_title_candidates)
      : [],
  }));

  const derivedKeywordEntries = normalizedVideos.flatMap((video) =>
    video.raw_title_candidates.map((candidate) => ({
      keyword: candidate,
      source: 'video_candidate',
      score: 1,
      videoCount: 1,
    })),
  );

  const keywordEntries = aggregateKeywordEntries([
    ...(Array.isArray(payload.keywords) ? payload.keywords : []),
    ...derivedKeywordEntries,
  ]);

  const sourceHealth =
    typeof payload.sourceHealth === 'object' && payload.sourceHealth
      ? payload.sourceHealth
      : {
          status: payload.sourceHealth || 'ok',
          provider: 'tiktok',
        };

  return {
    ok: sourceHealth.status === 'ok',
    fetchedAt: payload.fetchedAt || new Date().toISOString(),
    sourceHealth,
    sampleCount: toNumber(payload.sampleCount, normalizedVideos.length),
    videos: normalizedVideos,
    keywords: keywordEntries,
  };
}

function previewList(values = [], limit = 8) {
  const items = values.filter(Boolean);
  if (!items.length) return '(none)';
  const preview = items.slice(0, limit).join(' | ');
  return items.length > limit ? `${preview} | ...` : preview;
}

function logKeywordSummary(label, entries = [], limit = 8, icon = LOG_ICONS.shortlist) {
  const formatted = entries.map((entry) =>
    typeof entry === 'string' ? entry : `${entry.keyword} [${roundTo(entry.score || 0, 1)}]`,
  );
  console.log(`${icon} [TRENDING] ${label}: ${entries.length}`);
  console.log(`   -> ${previewList(formatted, limit)}`);
}

function logMatchSummary(label, summary = {}, limit = 8, icon = LOG_ICONS.match) {
  const matched = summary.matched || [];
  const unmatched = summary.unmatched || [];
  console.log(`${icon} [TRENDING] ${label}: matched ${matched.length}, unmatched ${unmatched.length}`);

  matched.slice(0, limit).forEach((item) => {
    console.log(
      `   ${LOG_ICONS.ok} [MATCH] ${item.keyword || item.title} -> ${item.movie} (${item.via || 'direct'}, score=${roundTo(item.score || 0, 2)})`,
    );
  });

  if (unmatched.length > 0) {
    console.log(`   ${LOG_ICONS.miss} [MISS] ${previewList(unmatched.slice(0, limit))}`);
  }
}

function logCandidateBoard(label, candidates = [], limit = 10, icon = LOG_ICONS.shortlist) {
  console.log(`${icon} [TRENDING] ${label}: ${candidates.length}`);
  candidates.slice(0, limit).forEach((candidate, index) => {
    console.log(
      `   [${index + 1}] ${candidate.title} | primary=${candidate.primary_source} | tiktok=${roundTo(candidate.signal_scores?.tiktok || 0, 2)} | google=${roundTo(candidate.signal_scores?.google || 0, 2)} | tmdb=${roundTo(candidate.signal_scores?.tmdb || 0, 2)} | fallback=${candidate.fallback_mode ? 'yes' : 'no'}`,
    );
  });
}
function createEmptySignalState() {
  return {
    tiktok: { present: false, count: 0, videos: 0 },
    tmdb: { present: false, count: 0, popularity: 0, sources: [] },
    google: { present: false, count: 0 },
  };
}

function buildCandidateKey(localMovie) {
  return `movie:${String(localMovie._id)}`;
}

function createAggregatedCandidate(localMovie, tmdbCandidate = null) {
  return {
    candidate_key: buildCandidateKey(localMovie),
    tmdb_id: tmdbCandidate?.tmdb_id || localMovie.tmdb?.id || null,
    tmdb_type: tmdbCandidate?.tmdb_type || localMovie.tmdb?.type || 'movie',
    title: localMovie.name || tmdbCandidate?.title || '',
    original_title: localMovie.original_name || tmdbCandidate?.original_title || '',
    movieId: localMovie._id,
    slug: localMovie.slug,
    poster_url: localMovie.poster_url || tmdbCandidate?.poster_url || '',
    thumb_url: localMovie.thumb_url || tmdbCandidate?.thumb_url || '',
    overview: localMovie.content || tmdbCandidate?.overview || '',
    popularity: toNumber(tmdbCandidate?.popularity, 0),
    vote_average: toNumber(tmdbCandidate?.vote_average, localMovie.tmdb?.vote_average || 0),
    viewCount: toNumber(localMovie.viewCount, 0),
    rating: toNumber(localMovie.rating, 0),
    totalRatings: toNumber(localMovie.totalRatings, 0),
    signals: createEmptySignalState(),
    matched_keywords: {
      tiktok: [],
      google: [],
    },
    signal_scores: {
      tiktok: 0,
      tmdb: 0,
      google: 0,
    },
    primary_source: 'tmdb',
    source: 'tmdb',
    fallback_mode: false,
  };
}

function ensureAggregatedCandidate(aggregateMap, localMovie, tmdbCandidate = null) {
  const key = String(localMovie._id);
  if (!aggregateMap.has(key)) {
    aggregateMap.set(key, createAggregatedCandidate(localMovie, tmdbCandidate));
  }

  const candidate = aggregateMap.get(key);
  if (tmdbCandidate) {
    candidate.tmdb_id = candidate.tmdb_id || tmdbCandidate.tmdb_id || null;
    candidate.tmdb_type = candidate.tmdb_type || tmdbCandidate.tmdb_type || 'movie';
    candidate.poster_url = candidate.poster_url || tmdbCandidate.poster_url || '';
    candidate.thumb_url = candidate.thumb_url || tmdbCandidate.thumb_url || '';
    candidate.overview = candidate.overview || tmdbCandidate.overview || '';
    candidate.popularity = Math.max(candidate.popularity || 0, tmdbCandidate.popularity || 0);
    candidate.vote_average = Math.max(candidate.vote_average || 0, tmdbCandidate.vote_average || 0);
  }

  return candidate;
}

function applyTikTokSignal(candidate, keywordEntry, weight = 1) {
  candidate.signals.tiktok.present = true;
  candidate.signals.tiktok.count += 1;
  candidate.signals.tiktok.videos = Math.max(
    candidate.signals.tiktok.videos,
    toNumber(keywordEntry?.videoCount, 0),
  );
  candidate.signal_scores.tiktok += Math.max(1, toNumber(keywordEntry?.score, 1)) * weight;
  candidate.matched_keywords.tiktok = mergeUniqueStrings(candidate.matched_keywords.tiktok, [
    keywordEntry?.keyword || keywordEntry?.normalized,
  ]);
}

function applyGoogleSignal(candidate, keywordEntry) {
  candidate.signals.google.present = true;
  candidate.signals.google.count += 1;
  candidate.signal_scores.google += Math.max(1, toNumber(keywordEntry?.score, 1));
  candidate.matched_keywords.google = mergeUniqueStrings(candidate.matched_keywords.google, [
    keywordEntry?.keyword || keywordEntry?.normalized,
  ]);
}

function applyTMDBSignal(candidate, tmdbCandidate) {
  candidate.signals.tmdb.present = true;
  candidate.signals.tmdb.count += 1;
  candidate.signals.tmdb.popularity = Math.max(
    candidate.signals.tmdb.popularity || 0,
    toNumber(tmdbCandidate?.popularity, 0),
  );
  candidate.signals.tmdb.sources = mergeUniqueStrings(candidate.signals.tmdb.sources, [
    tmdbCandidate?.search_origin || 'tmdb_trending',
  ]);
  candidate.signal_scores.tmdb = Math.max(
    candidate.signal_scores.tmdb || 0,
    roundTo(Math.min(5, toNumber(tmdbCandidate?.popularity, 0) / 100), 2),
  );
}

function computeFieldMatchScore(keywordNorm, fieldNorm) {
  if (!keywordNorm || !fieldNorm) return 0;
  if (keywordNorm === fieldNorm) return 1;

  if (fieldNorm.includes(keywordNorm) && keywordNorm.length >= 4) {
    return Math.min(0.92, 0.62 + keywordNorm.length / Math.max(fieldNorm.length, keywordNorm.length));
  }

  if (keywordNorm.includes(fieldNorm) && fieldNorm.length >= 4) {
    return Math.min(0.88, 0.56 + fieldNorm.length / keywordNorm.length);
  }

  const keywordTokens = keywordNorm.split(' ').filter(Boolean);
  const fieldTokens = fieldNorm.split(' ').filter(Boolean);
  if (!keywordTokens.length || !fieldTokens.length) return 0;

  const shared = keywordTokens.filter((token) => fieldTokens.includes(token)).length;
  const overlap = shared / Math.max(keywordTokens.length, fieldTokens.length);
  return overlap >= 0.75 ? overlap : 0;
}

function pickPreferredMovie(candidates = []) {
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => {
    const aHasTmdb = a.tmdb?.id ? 1 : 0;
    const bHasTmdb = b.tmdb?.id ? 1 : 0;
    if (bHasTmdb !== aHasTmdb) return bHasTmdb - aHasTmdb;
    if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
    return toNumber(b.rating, 0) - toNumber(a.rating, 0);
  })[0];
}

async function buildLocalMovieIndex() {
  const localMovies = await MovieModel.find({ isHidden: { $ne: true } })
    .select('_id name original_name slug poster_url thumb_url content tmdb viewCount rating totalRatings year')
    .lean();

  const indexedMovies = localMovies.map((movie) => ({
    ...movie,
    __normalizedName: normalizeText(movie.name),
    __normalizedOriginalName: normalizeText(movie.original_name),
    __normalizedSlug: normalizeText(String(movie.slug || '').replace(/-/g, ' ')),
  }));

  const byTmdbId = new Map();
  const byExact = new Map();

  indexedMovies.forEach((movie) => {
    if (movie.tmdb?.id) {
      byTmdbId.set(movie.tmdb.id, movie);
    }

    [movie.__normalizedName, movie.__normalizedOriginalName, movie.__normalizedSlug]
      .filter(Boolean)
      .forEach((key) => {
        if (!byExact.has(key)) {
          byExact.set(key, []);
        }
        byExact.get(key).push(movie);
      });
  });

  return {
    movies: indexedMovies,
    byTmdbId,
    byExact,
  };
}

function findBestLocalMovieMatch(keyword, localIndex, minScore = 0.74) {
  if (!isUsefulKeyword(keyword)) return null;

  const normalizedKeyword = normalizeText(keyword);
  const slugKeyword = normalizeText(normalizeSlug(keyword).replace(/-/g, ' '));

  const exactMatches = [
    ...(localIndex.byExact.get(normalizedKeyword) || []),
    ...(slugKeyword ? localIndex.byExact.get(slugKeyword) || [] : []),
  ];

  if (exactMatches.length > 0) {
    const bestExact = pickPreferredMovie(exactMatches);
    return { movie: bestExact, score: 1 };
  }

  let best = null;
  for (const movie of localIndex.movies) {
    const score = Math.max(
      computeFieldMatchScore(normalizedKeyword, movie.__normalizedName),
      computeFieldMatchScore(normalizedKeyword, movie.__normalizedOriginalName),
      computeFieldMatchScore(normalizedKeyword, movie.__normalizedSlug),
    );

    if (score < minScore) continue;

    if (!best || score > best.score || (score === best.score && movie.viewCount > best.movie.viewCount)) {
      best = { movie, score };
    }
  }

  return best;
}
function mergeTMDBCandidates(...candidateLists) {
  const merged = new Map();

  candidateLists.flat().forEach((candidate) => {
    if (!candidate?.tmdb_id) return;

    if (!merged.has(candidate.tmdb_id)) {
      merged.set(candidate.tmdb_id, {
        ...candidate,
        tiktok_keywords: mergeUniqueStrings(candidate.tiktok_keywords || []),
      });
      return;
    }

    const existing = merged.get(candidate.tmdb_id);
    existing.title = existing.title || candidate.title || '';
    existing.original_title = existing.original_title || candidate.original_title || '';
    existing.poster_url = existing.poster_url || candidate.poster_url || '';
    existing.thumb_url = existing.thumb_url || candidate.thumb_url || '';
    existing.overview = existing.overview || candidate.overview || '';
    existing.popularity = Math.max(existing.popularity || 0, candidate.popularity || 0);
    existing.vote_average = Math.max(existing.vote_average || 0, candidate.vote_average || 0);
    existing.search_origin =
      existing.search_origin === 'tmdb_trending' ? existing.search_origin : candidate.search_origin;
    existing.tiktok_keywords = mergeUniqueStrings(existing.tiktok_keywords, candidate.tiktok_keywords || []);
  });

  return Array.from(merged.values());
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeTikTokWorkerCommand(command) {
  const { stdout } = await execAsync(command, {
    timeout: TIKTOK_FETCH_TIMEOUT_MS,
    maxBuffer: 5 * 1024 * 1024,
    windowsHide: true,
  });

  const output = String(stdout || '').trim();
  if (!output) {
    throw new Error('TikTok worker command returned empty stdout.');
  }

  return JSON.parse(output);
}

async function fetchTikTokTrending() {
  console.log(`${LOG_ICONS.tiktok} [TRENDING] TikTok fetch started...`);

  if (!TIKTOK_ENABLED) {
    console.warn(`${LOG_ICONS.fallback} [TRENDING] TikTok source disabled by TIKTOK_ENABLED=false. Using fallback.`);
    return normalizeTikTokPayload({
      sourceHealth: { status: 'disabled', provider: 'tiktok' },
      videos: [],
      keywords: [],
      sampleCount: 0,
    });
  }

  if (!TIKTOK_WORKER_URL && !TIKTOK_WORKER_CMD) {
    console.warn(`${LOG_ICONS.fallback} [TRENDING] No TikTok worker URL or command configured. Using fallback.`);
    return normalizeTikTokPayload({
      sourceHealth: { status: 'unavailable', provider: 'tiktok', message: 'worker_not_configured' },
      videos: [],
      keywords: [],
      sampleCount: 0,
    });
  }

  let lastError = null;

  for (let attempt = 1; attempt <= TIKTOK_FETCH_RETRIES; attempt += 1) {
    try {
      let payload;

      if (TIKTOK_WORKER_URL) {
        const baseUrl = TIKTOK_WORKER_URL.replace(/\/$/, '');
        const { data } = await axios.get(`${baseUrl}/trending`, {
          params: { count: TIKTOK_TRENDING_COUNT },
          timeout: TIKTOK_FETCH_TIMEOUT_MS,
        });
        payload = data;
      } else {
        payload = await executeTikTokWorkerCommand(TIKTOK_WORKER_CMD);
      }

      const normalizedPayload = normalizeTikTokPayload(payload);
      console.log(
        `${LOG_ICONS.ok} [TRENDING] TikTok fetch success: ${normalizedPayload.sampleCount} videos, ${normalizedPayload.keywords.length} usable keywords.`,
      );
      normalizedPayload.videos.slice(0, 5).forEach((video, index) => {
        console.log(
          `   ${LOG_ICONS.tiktok} [VIDEO ${index + 1}] @${video.author || 'unknown'} | ${String(video.desc || '').slice(0, 90)} | candidates=${previewList(video.raw_title_candidates, 4)}`,
        );
      });
      logKeywordSummary('TikTok keyword board', normalizedPayload.keywords, 10, LOG_ICONS.tiktok);
      return normalizedPayload;
    } catch (error) {
      lastError = error;
      console.warn(`${LOG_ICONS.warn} [TRENDING] TikTok fetch attempt ${attempt}/${TIKTOK_FETCH_RETRIES} failed: ${error.message}`);
      if (attempt < TIKTOK_FETCH_RETRIES) {
        await sleep(750);
      }
    }
  }

  console.warn(`${LOG_ICONS.fallback} [TRENDING] TikTok fetch failed. Falling back to TMDB + Google. Reason: ${lastError?.message}`);
  return normalizeTikTokPayload({
    sourceHealth: {
      status: 'error',
      provider: 'tiktok',
      message: lastError?.message || 'unknown_error',
    },
    videos: [],
    keywords: [],
    sampleCount: 0,
  });
}

async function fetchTMDBVietnam() {
  console.log(`${LOG_ICONS.tmdb} [TRENDING] Step 1: fetching TMDB Vietnam trending feed...`);

  if (!TMDB_API_KEY) {
    console.warn('[TRENDING] TMDB_API_KEY missing. Skipping TMDB trending source.');
    return [];
  }

  const movies = new Map();
  const endpoints = [
    { url: `${TMDB_BASE}/trending/movie/week`, label: 'Trending Week' },
    { url: `${TMDB_BASE}/trending/movie/day`, label: 'Trending Day' },
  ];

  for (const endpoint of endpoints) {
    try {
      for (let page = 1; page <= 2; page += 1) {
        const { data } = await axios.get(endpoint.url, {
          params: {
            api_key: TMDB_API_KEY,
            language: 'vi-VN',
            page,
          },
          timeout: 10000,
        });

        (data.results || []).forEach((item) => {
          if (!movies.has(item.id)) {
            movies.set(item.id, mapTMDBItem(item, { search_origin: 'tmdb_trending' }));
          }
        });
      }

      console.log(`${LOG_ICONS.tmdb} [TRENDING] ${endpoint.label}: ${movies.size} unique TMDB candidates so far.`);
    } catch (error) {
      console.warn(`${LOG_ICONS.warn} [TRENDING] ${endpoint.label} failed: ${error.message}`);
    }
  }

  const results = Array.from(movies.values());
  logKeywordSummary(
    'TMDB trending picks',
    results.map((movie) => `${movie.title} [${Math.round(movie.popularity || 0)}]`),
    10,
    LOG_ICONS.tmdb,
  );
  return results;
}

async function fetchTMDBSearchCandidates(keywordEntries = []) {
  if (!TMDB_API_KEY || !keywordEntries.length) {
    return [];
  }

  console.log(`${LOG_ICONS.tmdb} [TRENDING] Searching TMDB for TikTok-derived candidates...`);
  const results = new Map();
  const selectedKeywords = keywordEntries.slice(0, TIKTOK_TMDB_SEARCH_LIMIT);

  for (const entry of selectedKeywords) {
    try {
      const { data } = await axios.get(`${TMDB_BASE}/search/multi`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'vi-VN',
          query: entry.keyword,
          include_adult: false,
          page: 1,
        },
        timeout: 10000,
      });

      (data.results || [])
        .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 3)
        .forEach((item) => {
          const mapped = mapTMDBItem(item, {
            search_origin: 'tiktok_search',
            tiktok_keywords: [entry.keyword],
            tmdb_type: item.media_type,
          });

          if (!results.has(mapped.tmdb_id)) {
            results.set(mapped.tmdb_id, mapped);
            return;
          }

          const existing = results.get(mapped.tmdb_id);
          existing.tiktok_keywords = mergeUniqueStrings(existing.tiktok_keywords, mapped.tiktok_keywords);
          existing.popularity = Math.max(existing.popularity || 0, mapped.popularity || 0);
          existing.vote_average = Math.max(existing.vote_average || 0, mapped.vote_average || 0);
          existing.poster_url = existing.poster_url || mapped.poster_url;
          existing.thumb_url = existing.thumb_url || mapped.thumb_url;
          existing.title = existing.title || mapped.title;
          existing.original_title = existing.original_title || mapped.original_title;
        });
    } catch (error) {
      console.warn(`${LOG_ICONS.warn} [TRENDING] TMDB search failed for "${entry.keyword}": ${error.message}`);
    }
  }

  const mergedResults = Array.from(results.values());
  console.log(`${LOG_ICONS.tmdb} [TRENDING] TMDB search produced ${mergedResults.length} extra candidates from TikTok keywords.`);
  logKeywordSummary(
    'TMDB search results',
    mergedResults.map((movie) => `${movie.title} <- ${previewList(movie.tiktok_keywords, 2)}`),
    10,
    LOG_ICONS.tmdb,
  );
  return mergedResults;
}

async function fetchGoogleTrendsVN() {
  console.log(`${LOG_ICONS.google} [TRENDING] Step 2: reading Google Trends Vietnam RSS...`);

  try {
    const feed = await rssParser.parseURL('https://trends.google.com/trending/rss?geo=VN');
    const keywords = mergeUniqueStrings(
      (feed.items || []).map((item) => String(item?.title || '').toLowerCase()),
    );

    console.log(`${LOG_ICONS.google} [TRENDING] Google Trends returned ${keywords.length} unique keywords.`);
    logKeywordSummary('Google Trends keyword board', keywords, 10, LOG_ICONS.google);
    return keywords;
  } catch (error) {
    console.warn(`${LOG_ICONS.warn} [TRENDING] Google Trends RSS failed: ${error.message}`);
    return [];
  }
}
async function crawlMissingTrendingCandidates(unmatchedCandidates = []) {
  if (!AUTO_CRAWL_LIMIT || !unmatchedCandidates.length) {
    return [];
  }

  const prioritized = [...unmatchedCandidates]
    .sort((a, b) => {
      const aPriority = (a.tiktok_keywords?.length || 0) * 100 + toNumber(a.popularity, 0);
      const bPriority = (b.tiktok_keywords?.length || 0) * 100 + toNumber(b.popularity, 0);
      return bPriority - aPriority;
    })
    .slice(0, AUTO_CRAWL_LIMIT);

  const crawledMovies = [];
  console.log(`${LOG_ICONS.crawl} [TRENDING] Attempting auto-crawl for ${prioritized.length} missing TMDB candidates...`);

  for (const candidate of prioritized) {
    try {
      const searchResults = await crawlerService.searchMovies(candidate.title);
      const bestMatch = Array.isArray(searchResults)
        ? searchResults.find((result) => toNumber(result?.similarity, 0) >= 0.75)
        : null;

      if (!bestMatch?.slug) {
        continue;
      }

      const crawlResult = await crawlerService.crawlMovieBySlug(bestMatch.slug);
      if (!crawlResult?.success) {
        continue;
      }

      const newMovie = await MovieModel.findOne({ slug: bestMatch.slug })
        .select('_id name original_name slug poster_url thumb_url content tmdb viewCount rating totalRatings year')
        .lean();

      if (!newMovie) {
        continue;
      }

      crawledMovies.push({
        candidate,
        movie: {
          ...newMovie,
          __normalizedName: normalizeText(newMovie.name),
          __normalizedOriginalName: normalizeText(newMovie.original_name),
          __normalizedSlug: normalizeText(String(newMovie.slug || '').replace(/-/g, ' ')),
        },
      });
    } catch (error) {
      console.warn(`${LOG_ICONS.warn} [TRENDING] Auto-crawl failed for "${candidate.title}": ${error.message}`);
    }
  }

  if (crawledMovies.length > 0) {
    console.log(`${LOG_ICONS.crawl} [TRENDING] Auto-crawl added ${crawledMovies.length} local movies for trending candidates.`);
  }

  return crawledMovies;
}

function upsertKeywordSignalMatches({ aggregateMap, keywordEntries, localIndex, signalType }) {
  const minScore = signalType === 'google' ? 0.8 : 0.74;
  const matched = [];
  const unmatched = [];

  keywordEntries.forEach((entry) => {
    const match = findBestLocalMovieMatch(entry.keyword, localIndex, minScore);
    if (!match?.movie) {
      unmatched.push(entry.keyword);
      return;
    }

    const aggregate = ensureAggregatedCandidate(aggregateMap, match.movie);
    if (signalType === 'tiktok') {
      applyTikTokSignal(aggregate, entry, match.score >= 1 ? 1.2 : 1);
    } else {
      applyGoogleSignal(aggregate, entry);
    }

    matched.push({
      keyword: entry.keyword,
      movie: match.movie.name,
      score: match.score,
      via: signalType,
    });
  });

  return { matched, unmatched };
}

async function mergeTMDBCandidatesIntoAggregate({ aggregateMap, tmdbCandidates, localIndex }) {
  const unmatchedCandidates = [];
  const matched = [];

  tmdbCandidates.forEach((tmdbCandidate) => {
    let localMovie = tmdbCandidate.tmdb_id ? localIndex.byTmdbId.get(tmdbCandidate.tmdb_id) : null;
    let via = 'tmdb_id';

    if (!localMovie) {
      const fallbackMatch = findBestLocalMovieMatch(
        tmdbCandidate.title || tmdbCandidate.original_title,
        localIndex,
        0.82,
      );
      localMovie = fallbackMatch?.movie || null;
      via = fallbackMatch?.movie ? 'title' : via;
    }

    if (!localMovie) {
      unmatchedCandidates.push(tmdbCandidate);
      return;
    }

    const aggregate = ensureAggregatedCandidate(aggregateMap, localMovie, tmdbCandidate);
    applyTMDBSignal(aggregate, tmdbCandidate);

    tmdbCandidate.tiktok_keywords.forEach((keyword) =>
      applyTikTokSignal(aggregate, { keyword, score: 1, source: 'tmdb_search' }),
    );

    matched.push({
      title: tmdbCandidate.title,
      movie: localMovie.name,
      score: tmdbCandidate.popularity || 0,
      via,
    });
  });

  const crawledMatches = await crawlMissingTrendingCandidates(unmatchedCandidates);
  const crawled = [];
  crawledMatches.forEach(({ candidate, movie }) => {
    localIndex.movies.push(movie);
    if (movie.tmdb?.id) {
      localIndex.byTmdbId.set(movie.tmdb.id, movie);
    }

    [movie.__normalizedName, movie.__normalizedOriginalName, movie.__normalizedSlug]
      .filter(Boolean)
      .forEach((key) => {
        if (!localIndex.byExact.has(key)) {
          localIndex.byExact.set(key, []);
        }
        localIndex.byExact.get(key).push(movie);
      });

    const aggregate = ensureAggregatedCandidate(aggregateMap, movie, candidate);
    applyTMDBSignal(aggregate, candidate);
    candidate.tiktok_keywords.forEach((keyword) =>
      applyTikTokSignal(aggregate, { keyword, score: 1, source: 'tmdb_search' }),
    );

    crawled.push({
      title: candidate.title,
      movie: movie.name,
      score: candidate.popularity || 0,
      via: 'auto_crawl',
    });
  });

  return {
    matched,
    crawled,
    unmatched: unmatchedCandidates.map((candidate) => candidate.title),
  };
}

function finalizeCandidate(candidate, fallbackMode = false) {
  candidate.matched_keywords.tiktok = mergeUniqueStrings(candidate.matched_keywords.tiktok);
  candidate.matched_keywords.google = mergeUniqueStrings(candidate.matched_keywords.google);
  candidate.signals.tmdb.sources = mergeUniqueStrings(candidate.signals.tmdb.sources || []);
  candidate.signal_scores.tiktok = roundTo(candidate.signal_scores.tiktok, 2);
  candidate.signal_scores.tmdb = roundTo(candidate.signal_scores.tmdb, 2);
  candidate.signal_scores.google = roundTo(candidate.signal_scores.google, 2);
  candidate.fallback_mode = Boolean(fallbackMode && !candidate.signals.tiktok.present);

  if (candidate.signals.tiktok.present && candidate.signals.google.present) {
    candidate.primary_source = 'hybrid';
  } else if (candidate.signals.tiktok.present) {
    candidate.primary_source = 'tiktok';
  } else if (candidate.signals.google.present && candidate.signals.tmdb.present) {
    candidate.primary_source = 'hybrid';
  } else if (candidate.signals.google.present) {
    candidate.primary_source = 'google';
  } else {
    candidate.primary_source = 'tmdb';
  }

  candidate.source = candidate.signals.google.present && candidate.signals.tmdb.present
    ? 'both'
    : candidate.signals.google.present
      ? 'google'
      : 'tmdb';

  candidate.rank_hint =
    candidate.signal_scores.tiktok * 4 +
    candidate.signal_scores.google * 2 +
    candidate.signal_scores.tmdb +
    Math.min(2, toNumber(candidate.vote_average, 0) / 5) +
    Math.min(1.5, toNumber(candidate.viewCount, 0) / 50000);

  return candidate;
}

async function buildTrendingCandidates({ tiktokPayload, tmdbMovies, googleKeywords, fallbackMode = false }) {
  console.log(`${LOG_ICONS.match} [TRENDING] Step 3: building candidate set from TikTok / TMDB / Google...`);

  const localIndex = await buildLocalMovieIndex();
  const aggregateMap = new Map();

  const tiktokKeywords = aggregateKeywordEntries(tiktokPayload?.keywords || []);
  if (tiktokKeywords.length > 0) {
    console.log(`${LOG_ICONS.tiktok} [TRENDING] Matching ${tiktokKeywords.length} TikTok keywords into local DB...`);
    const tiktokSummary = upsertKeywordSignalMatches({
      aggregateMap,
      keywordEntries: tiktokKeywords,
      localIndex,
      signalType: 'tiktok',
    });
    logMatchSummary('TikTok -> local matches', tiktokSummary, 8, LOG_ICONS.tiktok);
  }

  const tmdbSearchCandidates =
    tiktokKeywords.length > 0 ? await fetchTMDBSearchCandidates(tiktokKeywords) : [];
  const combinedTMDBCandidates = mergeTMDBCandidates(tmdbMovies, tmdbSearchCandidates);
  const tmdbSummary = await mergeTMDBCandidatesIntoAggregate({
    aggregateMap,
    tmdbCandidates: combinedTMDBCandidates,
    localIndex,
  });
  logMatchSummary('TMDB -> local matches', tmdbSummary, 8, LOG_ICONS.tmdb);
  if (tmdbSummary.crawled?.length) {
    tmdbSummary.crawled.forEach((item) => {
      console.log(`   ${LOG_ICONS.crawl} [CRAWLED] ${item.title} -> ${item.movie}`);
    });
  }

  const googleKeywordEntries = aggregateKeywordEntries(
    googleKeywords.map((keyword) => ({
      keyword,
      score: 1,
      source: 'google',
    })),
  );

  if (googleKeywordEntries.length > 0) {
    console.log(`${LOG_ICONS.google} [TRENDING] Matching ${googleKeywordEntries.length} Google keywords into local DB...`);
    const googleSummary = upsertKeywordSignalMatches({
      aggregateMap,
      keywordEntries: googleKeywordEntries,
      localIndex,
      signalType: 'google',
    });
    logMatchSummary('Google -> local matches', googleSummary, 8, LOG_ICONS.google);
  }

  const candidates = Array.from(aggregateMap.values())
    .map((candidate) => finalizeCandidate(candidate, fallbackMode))
    .sort((a, b) => {
      if (b.rank_hint !== a.rank_hint) return b.rank_hint - a.rank_hint;
      if (b.signal_scores.tiktok !== a.signal_scores.tiktok) return b.signal_scores.tiktok - a.signal_scores.tiktok;
      if (b.signal_scores.google !== a.signal_scores.google) return b.signal_scores.google - a.signal_scores.google;
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      return b.viewCount - a.viewCount;
    });

  console.log(`${LOG_ICONS.shortlist} [TRENDING] Candidate builder produced ${candidates.length} matched local movies.`);
  logCandidateBoard('Candidate shortlist before LLM', candidates, 12, LOG_ICONS.shortlist);
  return candidates;
}
function fallbackScoring(matchedMovies) {
  console.log(`${LOG_ICONS.fallback} [TRENDING] Using fallback scoring...`);

  return matchedMovies
    .map((movie) => {
      let score = 1;
      score += Math.min(5, Math.round(movie.signal_scores.tiktok || 0));
      score += movie.signals.google.present ? 2 : 0;
      score += Math.min(2, Math.round((movie.popularity || 0) / 150));
      score += movie.vote_average >= 7 ? 1 : 0;
      score += movie.viewCount >= 50000 ? 1 : 0;

      let aiQuote = `TikTok dang day trend - ${movie.title}`;
      if (movie.signals.google.present && movie.signals.tiktok.present) {
        aiQuote = `TikTok + Google dang day manh - ${movie.title}`;
      } else if (movie.signals.google.present) {
        aiQuote = `Top tim kiem Google VN - ${movie.title}`;
      } else if (!movie.signals.tiktok.present) {
        aiQuote = `Dang hot tren TMDB - ${movie.title}`;
      }

      return {
        candidate_key: movie.candidate_key,
        tmdb_id: movie.tmdb_id,
        trend_score: clamp(score, 1, 10),
        ai_quote: aiQuote,
      };
    })
    .sort((a, b) => b.trend_score - a.trend_score)
    .slice(0, 10);
}

async function generateAIAssessment(matchedMovies) {
  console.log(`${LOG_ICONS.llm} [TRENDING] Step 4: asking LLM to rank the final candidate set...`);

  if (!OPENROUTER_API_KEY) {
    console.warn(`${LOG_ICONS.fallback} [TRENDING] OPENROUTER_API_KEY missing. Falling back to heuristic scoring.`);
    return fallbackScoring(matchedMovies);
  }

  if (!matchedMovies.length) {
    console.warn(`${LOG_ICONS.warn} [TRENDING] No matched movies available for AI assessment.`);
    return [];
  }

  const movieListForAI = matchedMovies.slice(0, 30).map((movie, index) => ({
    index: index + 1,
    candidate_key: movie.candidate_key,
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    original_title: movie.original_title,
    overview: String(movie.overview || '').substring(0, 180),
    popularity_score: Math.round(movie.popularity || 0),
    tmdb_rating: movie.vote_average,
    cinephine_views: movie.viewCount,
    tiktok_signal: {
      present: movie.signals.tiktok.present,
      score: movie.signal_scores.tiktok,
      matched_keywords: movie.matched_keywords.tiktok,
    },
    google_signal: {
      present: movie.signals.google.present,
      score: movie.signal_scores.google,
      matched_keywords: movie.matched_keywords.google,
    },
    tmdb_signal: {
      present: movie.signals.tmdb.present,
      score: movie.signal_scores.tmdb,
      sources: movie.signals.tmdb.sources,
    },
  }));

  console.log(`${LOG_ICONS.llm} [TRENDING] Sending candidate board to LLM:`);
  movieListForAI.slice(0, 12).forEach((movie) => {
    console.log(
      `   ${LOG_ICONS.llm} [INPUT] ${movie.title} | tiktok=${roundTo(movie.tiktok_signal.score || 0, 2)} | google=${roundTo(movie.google_signal.score || 0, 2)} | tmdb=${roundTo(movie.tmdb_signal.score || 0, 2)}`,
    );
  });

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const systemPrompt = `Ban la chuyen gia phan tich xu huong giai tri Viet Nam. Hom nay la ${today}.

Muc tieu: chon DUNG 10 phim dang viral nhat tren CinePhine hien tai.

Thu tu uu tien:
1. TikTok la nguon trending chinh. Phim xuat hien nhieu trong TikTok signal hoac co matched_keywords.tiktok manh phai duoc uu tien cao.
2. Google Trends Viet Nam la tin hieu xac nhan bo sung.
3. TMDB popularity va rating chi de enrich, KHONG duoc de no gate candidate set.

Output JSON only, format:
{
  "results": [
    {
      "candidate_key": "movie:...",
      "trend_score": 9,
      "ai_quote": "Cau slogan GenZ toi da 15 chu"
    }
  ]
}

Yeu cau ai_quote:
- Tieng Viet, ngam trend, gon, toi da 15 chu.
- Tap trung tao curiosity de user muon click.
- Co the dung 1 emoji neu that su can.`;

  const userPrompt = `Danh sach ung vien phim:\n${JSON.stringify(movieListForAI, null, 2)}`;

  try {
    const { data } = await axios.post(
      OPENROUTER_URL,
      {
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://cinephine.io.vn',
          'X-Title': 'CinePhine Trending Pipeline',
        },
        timeout: 30000,
      },
    );

    const content = data?.choices?.[0]?.message?.content || '';
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response.');
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    const results = Array.isArray(parsed) ? parsed : parsed.results || parsed.movies || [];
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('LLM returned an empty ranking.');
    }

    console.log(`${LOG_ICONS.llm} [TRENDING] LLM ranked ${results.length} movies.`);
    results.slice(0, 10).forEach((result, index) => {
      const matched = matchedMovies.find(
        (movie) =>
          movie.candidate_key === result.candidate_key ||
          (movie.tmdb_id && result.tmdb_id && movie.tmdb_id === result.tmdb_id),
      );
      console.log(
        `   ${LOG_ICONS.llm} [PICK ${index + 1}] ${matched?.title || result.candidate_key || result.tmdb_id} | score=${result.trend_score} | quote=\"${result.ai_quote}\"`,
      );
    });
    return results.slice(0, 10);
  } catch (error) {
    console.error(`${LOG_ICONS.warn} [TRENDING] LLM assessment failed: ${error.message}`);
    return fallbackScoring(matchedMovies);
  }
}

async function saveTrendingToDB(aiResults, matchedMovies) {
  console.log(`${LOG_ICONS.final} [TRENDING] Step 5: saving trending batch to MongoDB...`);

  const matchLookup = new Map();
  matchedMovies.forEach((movie) => {
    matchLookup.set(movie.candidate_key, movie);
    if (movie.tmdb_id) {
      matchLookup.set(`tmdb:${movie.tmdb_id}`, movie);
    }
  });

  const docsToInsert = [];
  aiResults.forEach((result) => {
    const lookupKey = result.candidate_key || (result.tmdb_id ? `tmdb:${result.tmdb_id}` : null);
    if (!lookupKey || !matchLookup.has(lookupKey)) {
      return;
    }

    const matched = matchLookup.get(lookupKey);
    docsToInsert.push({
      tmdb_id: matched.tmdb_id || null,
      title: matched.title,
      original_title: matched.original_title,
      movieId: matched.movieId,
      slug: matched.slug,
      poster_url: matched.poster_url,
      thumb_url: matched.thumb_url,
      ai_quote: String(result.ai_quote || '').trim(),
      trend_score: clamp(toNumber(result.trend_score, 5), 1, 10),
      source: matched.source || 'tmdb',
      primary_source: matched.primary_source || 'tmdb',
      signals: matched.signals,
      matched_keywords: matched.matched_keywords,
      signal_scores: matched.signal_scores,
      fallback_mode: Boolean(matched.fallback_mode),
    });
  });

  if (!docsToInsert.length) {
    console.warn(`${LOG_ICONS.warn} [TRENDING] No trending docs produced for saving.`);
    return;
  }

  docsToInsert.sort((a, b) => b.trend_score - a.trend_score);

  await TrendingMovieModel.deleteMany({});
  await TrendingMovieModel.insertMany(docsToInsert);

  console.log(`${LOG_ICONS.final} [TRENDING] Saved ${docsToInsert.length} trending movies.`);
  docsToInsert.forEach((doc, index) => {
    console.log(
      `   ${LOG_ICONS.final} [FINAL ${index + 1}] ${doc.title} | score=${doc.trend_score} | primary=${doc.primary_source} | fallback=${doc.fallback_mode ? 'yes' : 'no'} | quote=\"${doc.ai_quote}\"`,
    );
  });
}

async function runPipeline() {
  const startTime = Date.now();

  if (mongoose.connection.readyState === 0) {
    console.log(`${LOG_ICONS.pipeline} [TRENDING] Connecting to MongoDB before pipeline run...`);
    await connectDB();
  }

  console.log('\n' + '='.repeat(70));
  console.log(`${LOG_ICONS.pipeline} [TRENDING PIPELINE] Starting social trending pipeline...`);
  console.log(`   Time: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log('='.repeat(70));

  try {
    const tiktokPayload = await fetchTikTokTrending();
    const usingFallbackSource = !tiktokPayload.ok;
    console.log(
      `${usingFallbackSource ? LOG_ICONS.fallback : LOG_ICONS.tiktok} [TRENDING] Pipeline mode: ${usingFallbackSource ? 'TMDB + Google fallback' : 'TikTok-first hybrid mode'}`,
    );

    const tmdbMovies = await fetchTMDBVietnam();
    const googleKeywords = await fetchGoogleTrendsVN();

    let matchedMovies = await buildTrendingCandidates({
      tiktokPayload: usingFallbackSource ? null : tiktokPayload,
      tmdbMovies,
      googleKeywords,
      fallbackMode: usingFallbackSource,
    });

    let effectiveFallbackMode = usingFallbackSource;

    if (!matchedMovies.length && !usingFallbackSource) {
      console.warn(`${LOG_ICONS.fallback} [TRENDING] TikTok did not produce local matches. Re-running in fallback mode.`);
      effectiveFallbackMode = true;
      matchedMovies = await buildTrendingCandidates({
        tiktokPayload: null,
        tmdbMovies,
        googleKeywords,
        fallbackMode: true,
      });
    }

    if (!matchedMovies.length) {
      console.warn(`${LOG_ICONS.warn} [TRENDING] No local movies matched any trending source. Pipeline stopped.`);
      return;
    }

    const aiResults = await generateAIAssessment(matchedMovies);
    const normalizedMatches = matchedMovies.map((movie) => ({
      ...movie,
      fallback_mode: Boolean(effectiveFallbackMode && !movie.signals.tiktok.present),
    }));

    await saveTrendingToDB(aiResults, normalizedMatches);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[TRENDING PIPELINE] Completed successfully in ${elapsed}s.`);
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error(`${LOG_ICONS.warn} [TRENDING PIPELINE] Failed: ${error.message}`);
    console.error(error.stack);
  }
}

async function getTrendingSocial() {
  return TrendingMovieModel.find({}).sort({ trend_score: -1, updatedAt: -1 }).limit(10).lean();
}

module.exports = {
  runPipeline,
  getTrendingSocial,
  fetchTikTokTrending,
  fetchTMDBVietnam,
  fetchGoogleTrendsVN,
  buildTrendingCandidates,
  generateAIAssessment,
  saveTrendingToDB,
};

