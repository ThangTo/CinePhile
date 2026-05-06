const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const mongoose = require('mongoose');
const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');

const DEFAULT_OPTIONS = {
  sampleSize: 5,
  episodeSelectionMode: 'sample',
  maxEpisodesPerJob: 500,
  sampleSeconds: 420,
  sampleRate: 8000,
  stepSec: 1,
  minDurationSec: 30,
  maxDurationSec: 140,
  maxStartSec: 300,
  similarityThreshold: 0.86,
  minAverageRms: 0.03,
  minVotes: 2,
  applySeasonDefault: true,
};
const VALID_EPISODE_SELECTION_MODES = new Set(['sample', 'remaining', 'all', 'specific']);
const FFMPEG_TIMEOUT_MS = Math.max(
  30000,
  Number.parseInt(process.env.INTRO_DETECTION_FFMPEG_TIMEOUT_MS, 10) || 180000,
);

function buildAutoWritableEpisodeFilter(baseFilter = {}) {
  const validIntroFilter = {
    'playbackMeta.intro.enabled': true,
    'playbackMeta.intro.startSec': { $gte: 0 },
    $expr: {
      $gt: ['$playbackMeta.intro.endSec', '$playbackMeta.intro.startSec'],
    },
  };

  return {
    ...baseFilter,
    $nor: [
      {
        'playbackMeta.detection.status': 'approved',
        ...validIntroFilter,
      },
      {
        'playbackMeta.detection.source': 'manual',
        ...validIntroFilter,
      },
    ],
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sha1(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function parsePositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function parseEpisodeNumberList(value) {
  const numbers = new Set();
  const addNumber = (item) => {
    const parsed = Number.parseInt(item, 10);
    if (Number.isFinite(parsed) && parsed > 0) numbers.add(parsed);
  };

  if (Array.isArray(value)) {
    value.forEach(addNumber);
    return [...numbers].sort((a, b) => a - b);
  }

  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((part) => {
      const rangeMatch = part.match(/(\d+)\s*-\s*(\d+)/);
      if (rangeMatch) {
        const start = Number.parseInt(rangeMatch[1], 10);
        const end = Number.parseInt(rangeMatch[2], 10);
        if (Number.isFinite(start) && Number.isFinite(end)) {
          const from = Math.min(start, end);
          const to = Math.max(start, end);
          for (let number = from; number <= to && number - from <= 200; number += 1) {
            addNumber(number);
          }
        }
        return;
      }

      const singleMatch = part.match(/\d+/);
      if (singleMatch) addNumber(singleMatch[0]);
    });

  return [...numbers].sort((a, b) => a - b);
}

function normalizeEpisodeSelectionOptions(rawOptions = {}) {
  const mode = VALID_EPISODE_SELECTION_MODES.has(rawOptions.episodeSelectionMode)
    ? rawOptions.episodeSelectionMode
    : 'sample';
  const maxEpisodesPerJob = parsePositiveInt(
    rawOptions.maxEpisodesPerJob ?? DEFAULT_OPTIONS.maxEpisodesPerJob,
    DEFAULT_OPTIONS.maxEpisodesPerJob,
    2,
    500,
  );

  return {
    mode,
    sampleSize: parsePositiveInt(rawOptions.sampleSize, DEFAULT_OPTIONS.sampleSize, 2, maxEpisodesPerJob),
    maxEpisodesPerJob,
    episodeNumbers: parseEpisodeNumberList(rawOptions.episodeNumbers),
  };
}

function hasValidEpisodeIntro(episode = {}) {
  const intro = episode.playbackMeta?.intro || {};
  const startSec = Number(intro.startSec);
  const endSec = Number(intro.endSec);

  return intro.enabled === true && Number.isFinite(startSec) && Number.isFinite(endSec) && startSec >= 0 && endSec > startSec;
}

function selectIntroDetectionEpisodes(episodes = [], rawOptions = {}) {
  const selection = normalizeEpisodeSelectionOptions(rawOptions);
  const ordered = [...episodes].sort((first, second) => {
    const episodeDelta = (Number(first.episodeId) || 0) - (Number(second.episodeId) || 0);
    if (episodeDelta !== 0) return episodeDelta;
    return String(first.audioType || '').localeCompare(String(second.audioType || ''));
  });

  if (selection.mode === 'all') {
    return ordered.slice(0, selection.maxEpisodesPerJob);
  }

  if (selection.mode === 'remaining') {
    return ordered
      .filter((episode) => !hasValidEpisodeIntro(episode))
      .slice(0, selection.sampleSize);
  }

  if (selection.mode === 'specific') {
    const wanted = new Set(selection.episodeNumbers);
    return ordered
      .filter((episode) => wanted.has(Number(episode.episodeId)))
      .slice(0, selection.maxEpisodesPerJob);
  }

  return ordered.slice(0, selection.sampleSize);
}

function cosineSimilarity(first = [], second = []) {
  const length = Math.min(first.length, second.length);
  if (!length) return 0;

  let dot = 0;
  let firstMag = 0;
  let secondMag = 0;

  for (let index = 0; index < length; index += 1) {
    const a = first[index] || 0;
    const b = second[index] || 0;
    dot += a * b;
    firstMag += a * a;
    secondMag += b * b;
  }

  if (!firstMag || !secondMag) return 0;
  return clamp(dot / (Math.sqrt(firstMag) * Math.sqrt(secondMag)), -1, 1);
}

function featureSimilarity(first, second) {
  const vectorScore = (cosineSimilarity(first?.vector, second?.vector) + 1) / 2;
  const firstRms = Number(first?.rms) || 0;
  const secondRms = Number(second?.rms) || 0;
  const rmsMax = Math.max(firstRms, secondRms, 0.001);
  const rmsScore = 1 - Math.min(1, Math.abs(firstRms - secondRms) / rmsMax);

  return (vectorScore * 0.85) + (rmsScore * 0.15);
}

function scoreCandidate(candidate, options) {
  const avgStart = (candidate.first.startSec + candidate.second.startSec) / 2;
  const startScore = 1 - clamp(avgStart / Math.max(1, options.maxStartSec), 0, 1);
  const energyScore = clamp(candidate.averageRms / 0.7, 0, 1);

  return (candidate.averageSimilarity * 0.72) + (energyScore * 0.18) + (startScore * 0.1);
}

function findBestPairMatch(firstFeatures = [], secondFeatures = [], rawOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...rawOptions };
  const firstLength = firstFeatures.length;
  const secondLength = secondFeatures.length;
  if (!firstLength || !secondLength) return null;

  let best = null;
  let previousLengths = new Array(secondLength).fill(0);
  let previousSimilaritySums = new Array(secondLength).fill(0);
  let previousRmsSums = new Array(secondLength).fill(0);

  for (let firstIndex = 0; firstIndex < firstLength; firstIndex += 1) {
    const lengths = new Array(secondLength).fill(0);
    const similaritySums = new Array(secondLength).fill(0);
    const rmsSums = new Array(secondLength).fill(0);

    for (let secondIndex = 0; secondIndex < secondLength; secondIndex += 1) {
      const similarity = featureSimilarity(firstFeatures[firstIndex], secondFeatures[secondIndex]);
      if (similarity < options.similarityThreshold) continue;

      const previousIndex = secondIndex - 1;
      const previousLength = previousIndex >= 0 ? previousLengths[previousIndex] : 0;
      const previousSimilaritySum = previousIndex >= 0 ? previousSimilaritySums[previousIndex] : 0;
      const previousRmsSum = previousIndex >= 0 ? previousRmsSums[previousIndex] : 0;
      const averageRms =
        ((Number(firstFeatures[firstIndex]?.rms) || 0) + (Number(secondFeatures[secondIndex]?.rms) || 0)) / 2;

      lengths[secondIndex] = previousLength + 1;
      similaritySums[secondIndex] = previousSimilaritySum + similarity;
      rmsSums[secondIndex] = previousRmsSum + averageRms;

      const durationSec = Math.min(lengths[secondIndex], options.maxDurationSec);
      if (durationSec < options.minDurationSec) continue;

      const firstStart = firstIndex - durationSec + 1;
      const secondStart = secondIndex - durationSec + 1;
      if (firstStart < 0 || secondStart < 0) continue;
      if (firstStart > options.maxStartSec || secondStart > options.maxStartSec) continue;

      const averageSimilarity = similaritySums[secondIndex] / lengths[secondIndex];
      const candidate = {
        first: {
          startSec: firstStart * options.stepSec,
          endSec: (firstStart + durationSec) * options.stepSec,
        },
        second: {
          startSec: secondStart * options.stepSec,
          endSec: (secondStart + durationSec) * options.stepSec,
        },
        durationSec: durationSec * options.stepSec,
        averageSimilarity,
        averageRms: rmsSums[secondIndex] / lengths[secondIndex],
      };

      if (candidate.averageRms < options.minAverageRms) continue;

      candidate.score = scoreCandidate(candidate, options);

      if (
        !best ||
        candidate.score > best.score ||
        (Math.abs(candidate.score - best.score) < 0.001 && candidate.durationSec > best.durationSec)
      ) {
        best = candidate;
      }
    }

    previousLengths = lengths;
    previousSimilaritySums = similaritySums;
    previousRmsSums = rmsSums;
  }

  return best;
}

function addCandidate(bucket, episode, range, match) {
  if (!bucket.has(episode.episodeId)) {
    bucket.set(episode.episodeId, {
      episodeId: episode.episodeId,
      episodeNumber: episode.episodeNumber,
      candidates: [],
    });
  }

  bucket.get(episode.episodeId).candidates.push({
    startSec: range.startSec,
    endSec: range.endSec,
    durationSec: match.durationSec,
    score: match.score,
  });
}

function groupCandidates(candidates, toleranceSec) {
  const groups = [];

  for (const candidate of candidates.sort((a, b) => a.startSec - b.startSec)) {
    const group = groups.find((item) => Math.abs(item.averageStartSec - candidate.startSec) <= toleranceSec);
    if (!group) {
      groups.push({
        candidates: [candidate],
        averageStartSec: candidate.startSec,
      });
      continue;
    }

    group.candidates.push(candidate);
    group.averageStartSec =
      group.candidates.reduce((total, item) => total + item.startSec, 0) / group.candidates.length;
  }

  return groups;
}

function summarizeCandidateGroup(group, maxPossibleVotes) {
  const candidates = group.candidates;
  const votes = candidates.length;
  const introStartSec = Math.round(candidates.reduce((total, item) => total + item.startSec, 0) / votes);
  const introEndSec = Math.round(candidates.reduce((total, item) => total + item.endSec, 0) / votes);
  const averageScore = candidates.reduce((total, item) => total + item.score, 0) / votes;
  const voteScore = maxPossibleVotes > 0 ? votes / maxPossibleVotes : 0;

  return {
    introStartSec,
    introEndSec,
    votes,
    averageScore,
    confidence: clamp((voteScore * 0.65) + (averageScore * 0.35), 0, 1),
  };
}

function detectCommonIntroFromFeatures(samples = [], rawOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...rawOptions };
  const usableSamples = samples.filter((sample) => Array.isArray(sample.features) && sample.features.length > 0);
  if (usableSamples.length < 2) return [];

  const buckets = new Map();

  for (let firstIndex = 0; firstIndex < usableSamples.length - 1; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < usableSamples.length; secondIndex += 1) {
      const first = usableSamples[firstIndex];
      const second = usableSamples[secondIndex];
      const match = findBestPairMatch(first.features, second.features, options);
      if (!match) continue;

      addCandidate(buckets, first, match.first, match);
      addCandidate(buckets, second, match.second, match);
    }
  }

  const maxPossibleVotes = usableSamples.length - 1;
  const requiredVotes = Math.min(options.minVotes, maxPossibleVotes);

  return [...buckets.values()]
    .map((bucket) => {
      const groups = groupCandidates(bucket.candidates, 12);
      const summaries = groups.map((group) => summarizeCandidateGroup(group, maxPossibleVotes));
      const best = summaries
        .filter((summary) => summary.votes >= requiredVotes)
        .sort((a, b) => b.confidence - a.confidence || b.votes - a.votes)[0];

      if (!best) return null;

      return {
        episodeId: bucket.episodeId,
        episodeNumber: bucket.episodeNumber,
        introStartSec: best.introStartSec,
        introEndSec: best.introEndSec,
        confidence: Number(best.confidence.toFixed(3)),
        votes: best.votes,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
}

function bufferToAudioFeatures(buffer, options = {}) {
  const sampleRate = options.sampleRate || DEFAULT_OPTIONS.sampleRate;
  const stepSec = options.stepSec || DEFAULT_OPTIONS.stepSec;
  const samplesPerWindow = sampleRate * stepSec;
  const bytesPerSample = 2;
  const totalSamples = Math.floor(buffer.length / bytesPerSample);
  const features = [];

  for (let offset = 0; offset + samplesPerWindow <= totalSamples; offset += samplesPerWindow) {
    const subWindowCount = 8;
    const subWindowSize = Math.max(1, Math.floor(samplesPerWindow / subWindowCount));
    const energies = new Array(subWindowCount).fill(0);
    let totalEnergy = 0;
    let zeroCrossings = 0;
    let previousSample = 0;

    for (let index = 0; index < samplesPerWindow; index += 1) {
      const absoluteSampleIndex = offset + index;
      const sample = buffer.readInt16LE(absoluteSampleIndex * bytesPerSample) / 32768;
      const energy = sample * sample;
      const bucket = Math.min(subWindowCount - 1, Math.floor(index / subWindowSize));
      energies[bucket] += energy;
      totalEnergy += energy;

      if (index > 0 && Math.sign(sample) !== Math.sign(previousSample)) {
        zeroCrossings += 1;
      }
      previousSample = sample;
    }

    const rms = Math.sqrt(totalEnergy / samplesPerWindow);
    const maxEnergy = Math.max(...energies, 0.000001);
    const vector = energies.map((energy) => Number((energy / maxEnergy).toFixed(4)));
    vector.push(Number((zeroCrossings / samplesPerWindow).toFixed(4)));

    features.push({ rms, vector });
  }

  return features;
}

function extractPcmAudio(sourceUrl, options = {}) {
  const sampleRate = options.sampleRate || DEFAULT_OPTIONS.sampleRate;
  const sampleSeconds = options.sampleSeconds || DEFAULT_OPTIONS.sampleSeconds;

  return new Promise((resolve, reject) => {
    const chunks = [];
    let settled = false;
    const command = ffmpeg(sourceUrl)
      .inputOptions([
        '-rw_timeout',
        '20000000',
        '-reconnect',
        '1',
        '-reconnect_streamed',
        '1',
        '-reconnect_delay_max',
        '2',
      ])
      .noVideo()
      .audioChannels(1)
      .audioFrequency(sampleRate)
      .duration(sampleSeconds)
      .format('s16le')
      .on('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      })
      .on('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        command.kill('SIGKILL');
      } catch (_error) {}
      reject(new Error(`FFmpeg timed out while reading intro sample after ${FFMPEG_TIMEOUT_MS}ms`));
    }, FFMPEG_TIMEOUT_MS);

    if (typeof timer.unref === 'function') timer.unref();

    const stream = command.pipe();
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function extractAudioFeatures(sourceUrl, options = {}) {
  const pcm = await extractPcmAudio(sourceUrl, options);
  return bufferToAudioFeatures(pcm, options);
}

async function resolveMovie(identifier) {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const movie = await Movie.findById(identifier).lean();
    if (movie) return movie;
  }

  return Movie.findOne({ slug: identifier }).lean();
}

async function detectIntroForMovie(identifier, rawOptions = {}, onProgress = null) {
  const options = { ...DEFAULT_OPTIONS, ...rawOptions };
  const selectionOptions = normalizeEpisodeSelectionOptions(options);
  if (onProgress) {
    onProgress({ percent: 2, step: 'load-movie', message: 'Loading movie metadata' });
  }

  const movie = await resolveMovie(identifier);
  if (!movie) throw new Error('Movie not found');

  if (onProgress) {
    onProgress({ percent: 4, step: 'load-episodes', message: 'Loading playable episodes' });
  }

  const playableEpisodes = await Episode.find({
    movieId: movie._id,
    link_m3u8: { $type: 'string', $ne: '' },
  })
    .sort({ episodeId: 1, audioType: 1 })
    .limit(selectionOptions.mode === 'sample' ? selectionOptions.sampleSize : selectionOptions.maxEpisodesPerJob)
    .lean();
  const episodes = selectIntroDetectionEpisodes(playableEpisodes, options);

  if (episodes.length < 2) {
    throw new Error('At least two selected playable episodes are required for intro detection');
  }

  const samples = [];
  for (let index = 0; index < episodes.length; index += 1) {
    const episode = episodes[index];
    if (onProgress) {
      onProgress({
        percent: 5 + Math.round((index / episodes.length) * 60),
        step: 'extract-audio',
        message: `Extracting audio sample ${index + 1}/${episodes.length}`,
      });
    }

    const features = await extractAudioFeatures(episode.link_m3u8, options);
    samples.push({
      episodeId: episode._id.toString(),
      episodeNumber: episode.episodeId,
      features,
      sourceHash: sha1(episode.link_m3u8),
    });

    if (onProgress) {
      onProgress({
        percent: 5 + Math.round(((index + 1) / episodes.length) * 60),
        step: 'extract-audio',
        message: `Extracted audio sample ${index + 1}/${episodes.length}`,
      });
    }
  }

  if (onProgress) {
      onProgress({
        percent: 70,
        step: 'match-intro',
        message: `Matching common intro audio (${selectionOptions.mode})`,
      });
  }
  const detections = detectCommonIntroFromFeatures(samples, options);
  const now = new Date();
  const jobId = options.jobId ? String(options.jobId) : null;

  if (onProgress) {
    onProgress({ percent: 82, step: 'save-results', message: 'Saving intro candidates' });
  }

  for (const detection of detections) {
    const sample = samples.find((item) => item.episodeId === detection.episodeId);
    await Episode.updateOne(
      buildAutoWritableEpisodeFilter({ _id: detection.episodeId }),
      {
        $set: {
          'playbackMeta.intro.enabled': true,
          'playbackMeta.intro.startSec': detection.introStartSec,
          'playbackMeta.intro.endSec': detection.introEndSec,
          'playbackMeta.detection.status':
            detection.confidence >= 0.85 ? 'detected' : 'needs_review',
          'playbackMeta.detection.source': 'auto',
          'playbackMeta.detection.confidence': detection.confidence,
          'playbackMeta.detection.sourceKey': `movie:${movie._id}:episode:${detection.episodeId}`,
          'playbackMeta.detection.sourceHash': sample?.sourceHash || null,
          'playbackMeta.detection.jobId': jobId,
          'playbackMeta.detection.detectedAt': now,
          'playbackMeta.detection.note': `Matched ${detection.votes} episode pairs`,
        },
      },
    );
  }

  let noMatchEpisodes = 0;
  if (detections.length === 0) {
    const sampledIds = samples.map((sample) => sample.episodeId);
    const sourceHash = sha1(samples.map((sample) => sample.sourceHash).sort().join(':'));
    const updateResult = await Episode.updateMany(
      buildAutoWritableEpisodeFilter({ _id: { $in: sampledIds } }),
      {
        $set: {
          'playbackMeta.intro.enabled': false,
          'playbackMeta.intro.startSec': null,
          'playbackMeta.intro.endSec': null,
          'playbackMeta.detection.status': 'no_match',
          'playbackMeta.detection.source': 'auto',
          'playbackMeta.detection.confidence': 0,
          'playbackMeta.detection.sourceKey': `movie:${movie._id}:no-match`,
          'playbackMeta.detection.sourceHash': sourceHash,
          'playbackMeta.detection.jobId': jobId,
          'playbackMeta.detection.detectedAt': now,
          'playbackMeta.detection.note': `No common intro detected from ${samples.length} sampled episodes`,
        },
      },
    );

    noMatchEpisodes = updateResult.modifiedCount || 0;
  }

  let inferredEpisodes = 0;
  if (selectionOptions.mode === 'sample' && options.applySeasonDefault !== false && detections.length >= 2) {
    if (onProgress) {
      onProgress({ percent: 90, step: 'infer-season', message: 'Applying season-level candidates' });
    }

    const sortedStarts = detections.map((item) => item.introStartSec).sort((a, b) => a - b);
    const sortedEnds = detections.map((item) => item.introEndSec).sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedStarts.length / 2);
    const defaultStartSec = sortedStarts[medianIndex];
    const defaultEndSec = sortedEnds[medianIndex];
    const averageConfidence =
      detections.reduce((total, item) => total + item.confidence, 0) / detections.length;
    const sampledIds = samples.map((sample) => sample.episodeId);

    const updateResult = await Episode.updateMany(
      buildAutoWritableEpisodeFilter({
        movieId: movie._id,
        _id: { $nin: sampledIds },
        link_m3u8: { $type: 'string', $ne: '' },
      }),
      {
        $set: {
          'playbackMeta.intro.enabled': true,
          'playbackMeta.intro.startSec': defaultStartSec,
          'playbackMeta.intro.endSec': defaultEndSec,
          'playbackMeta.detection.status': 'needs_review',
          'playbackMeta.detection.source': 'auto',
          'playbackMeta.detection.confidence': Number((averageConfidence * 0.75).toFixed(3)),
          'playbackMeta.detection.sourceKey': `movie:${movie._id}:season-default`,
          'playbackMeta.detection.sourceHash': sha1(`${movie._id}:${defaultStartSec}:${defaultEndSec}`),
          'playbackMeta.detection.jobId': jobId,
          'playbackMeta.detection.detectedAt': now,
          'playbackMeta.detection.note': 'Inferred from sampled episodes',
        },
      },
    );

    inferredEpisodes = updateResult.modifiedCount || 0;
  }

  const result = {
    movieId: movie._id.toString(),
    movieName: movie.name,
    selectionMode: selectionOptions.mode,
    eligibleEpisodes: playableEpisodes.length,
    sampledEpisodes: samples.length,
    detectedEpisodes: detections.length,
    inferredEpisodes,
    noMatchEpisodes,
    detections,
  };

  if (onProgress) {
    const message =
      detections.length > 0
        ? `Intro detection completed: ${detections.length} detected, ${inferredEpisodes} inferred`
        : `Intro detection completed: no common intro found in ${samples.length} sampled episodes`;
    onProgress({ percent: 100, step: 'completed', message });
  }

  return result;
}

module.exports = {
  buildAutoWritableEpisodeFilter,
  bufferToAudioFeatures,
  detectCommonIntroFromFeatures,
  detectIntroForMovie,
  extractAudioFeatures,
  featureSimilarity,
  findBestPairMatch,
  parseEpisodeNumberList,
  selectIntroDetectionEpisodes,
};
