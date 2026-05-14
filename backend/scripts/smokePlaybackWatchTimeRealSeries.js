const assert = require('assert');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const servicePath = path.resolve(__dirname, '../services/playbackHeartbeat.service.js');
const movieModelPath = path.resolve(__dirname, '../models/movie.model.js');
const episodeModelPath = path.resolve(__dirname, '../models/episode.model.js');
const viewHistoryPath = path.resolve(__dirname, '../models/view_history.model.js');
const streakServicePath = path.resolve(__dirname, '../services/watchStreak.service.js');
const questServicePath = path.resolve(__dirname, '../services/quest.service.js');
const leaderboardServicePath = path.resolve(__dirname, '../services/leaderboard.service.js');

const clone = (value) => JSON.parse(JSON.stringify(value));
const toId = (value) => (value && value.toString ? value.toString() : String(value));

const makeLeanResult = (value) => ({
  lean: async () => (value ? clone(value) : null),
});

const makeQueryResult = (value) => ({
  sort() {
    return makeLeanResult(value);
  },
  lean: async () => (value ? clone(value) : null),
});

const buildChunks = (targetSeconds) => {
  const pattern = [60, 92, 180, 300, 75, 244, 60, 299, 121, 300];
  const chunks = [];
  let remaining = targetSeconds;
  let index = 0;

  while (remaining > 0) {
    const next = Math.min(pattern[index % pattern.length], remaining);
    chunks.push(next);
    remaining -= next;
    index += 1;
  }

  return chunks;
};

const findRealSeriesFixture = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI for read-only real series lookup');
  }

  const Movie = require('../models/movie.model');
  const Episode = require('../models/episode.model');

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    family: 4,
  });

  const [candidate] = await Episode.aggregate([
    {
      $group: {
        _id: '$movieId',
        episodeCount: { $sum: 1 },
      },
    },
    { $match: { episodeCount: { $gt: 1 } } },
    {
      $lookup: {
        from: 'movies',
        localField: '_id',
        foreignField: '_id',
        as: 'movie',
      },
    },
    { $unwind: '$movie' },
    {
      $match: {
        'movie.isHidden': { $ne: true },
        $or: [
          { 'movie.type': { $in: ['series', 'tvshows', 'hoathinh'] } },
          { 'movie.totalEpisodes': { $gt: 1 } },
        ],
      },
    },
    { $sort: { episodeCount: -1, 'movie.updatedAt': -1 } },
    { $limit: 1 },
    {
      $project: {
        _id: 0,
        episodeCount: 1,
        movie: {
          _id: '$movie._id',
          name: '$movie.name',
          slug: '$movie.slug',
          type: '$movie.type',
          totalEpisodes: '$movie.totalEpisodes',
          currentEpisode: '$movie.currentEpisode',
        },
      },
    },
  ]);

  if (!candidate?.movie?._id) {
    throw new Error('No real series with at least two episode documents was found');
  }

  const episodeCandidates = await Episode.find({ movieId: candidate.movie._id })
    .sort({ episodeId: 1, audioType: 1 })
    .limit(50)
    .select('_id movieId episodeId slug audioType serverName duration')
    .lean();

  const episodes = [];
  const seenEpisodeNumbers = new Set();
  for (const episode of episodeCandidates) {
    const episodeNumber = String(episode.episodeId);
    if (seenEpisodeNumbers.has(episodeNumber)) continue;
    seenEpisodeNumbers.add(episodeNumber);
    episodes.push(episode);
    if (episodes.length === 2) break;
  }

  if (episodes.length < 2) {
    throw new Error(`Real series ${candidate.movie.slug} has fewer than two distinct episode numbers`);
  }

  await mongoose.disconnect();
  return {
    movie: candidate.movie,
    episodes,
    episodeCount: candidate.episodeCount,
  };
};

const installPlaybackMocks = ({ movie, episodes }) => {
  delete require.cache[servicePath];
  delete require.cache[movieModelPath];
  delete require.cache[episodeModelPath];
  delete require.cache[viewHistoryPath];
  delete require.cache[streakServicePath];
  delete require.cache[questServicePath];
  delete require.cache[leaderboardServicePath];

  const state = {
    movie: { ...clone(movie), _id: toId(movie._id) },
    episodes: episodes.map((episode) => ({ ...clone(episode), _id: toId(episode._id), movieId: toId(episode.movieId) })),
    viewRecordsById: {},
    createdRecords: [],
    movieUpdates: [],
    episodeUpdates: [],
    viewUpdates: [],
    questCalls: [],
  };

  require.cache[movieModelPath] = {
    id: movieModelPath,
    filename: movieModelPath,
    loaded: true,
    exports: {
      findById(id) {
        return makeLeanResult(toId(id) === state.movie._id ? state.movie : null);
      },
      findOne(query) {
        return makeLeanResult(query.slug === state.movie.slug ? state.movie : null);
      },
      findByIdAndUpdate(id, update) {
        state.movieUpdates.push({ id: toId(id), update: clone(update) });
        return Promise.resolve({ _id: id });
      },
    },
  };

  require.cache[episodeModelPath] = {
    id: episodeModelPath,
    filename: episodeModelPath,
    loaded: true,
    exports: {
      findByIdAndUpdate(id, update) {
        state.episodeUpdates.push({ id: toId(id), update: clone(update) });
        return Promise.resolve({ _id: id });
      },
    },
  };

  require.cache[viewHistoryPath] = {
    id: viewHistoryPath,
    filename: viewHistoryPath,
    loaded: true,
    exports: {
      findById(id) {
        return makeLeanResult(state.viewRecordsById[toId(id)] || null);
      },
      findOne(query) {
        const match = Object.values(state.viewRecordsById).find((record) => {
          if (toId(record.movieId) !== toId(query.movieId)) return false;
          if ((record.episodeId || null) !== (query.episodeId || null)) return false;
          if (query.userId && toId(record.userId) !== toId(query.userId)) return false;
          if (query.ipAddress && record.ipAddress !== query.ipAddress) return false;
          return true;
        });

        return makeQueryResult(match || null);
      },
      create(doc) {
        const createdId = `vh-real-series-${state.createdRecords.length + 1}`;
        const created = {
          _id: createdId,
          ...clone(doc),
        };

        state.createdRecords.push(created);
        state.viewRecordsById[createdId] = created;
        return Promise.resolve(clone(created));
      },
      findByIdAndUpdate(id, update) {
        const safeId = toId(id);
        state.viewUpdates.push({ id: safeId, update: clone(update) });
        if (update.$set?.userId && state.viewRecordsById[safeId]) {
          state.viewRecordsById[safeId].userId = update.$set.userId;
        }
        return Promise.resolve({ _id: id });
      },
    },
  };

  require.cache[streakServicePath] = {
    id: streakServicePath,
    filename: streakServicePath,
    loaded: true,
    exports: {
      recordStreak() {
        return Promise.resolve(null);
      },
    },
  };

  require.cache[questServicePath] = {
    id: questServicePath,
    filename: questServicePath,
    loaded: true,
    exports: {
      checkAndUpdateProgress(userId, payload) {
        state.questCalls.push({ userId: toId(userId), payload: clone(payload) });
        return Promise.resolve(null);
      },
    },
  };

  require.cache[leaderboardServicePath] = {
    id: leaderboardServicePath,
    filename: leaderboardServicePath,
    loaded: true,
    exports: {
      invalidateLeaderboardCache() {
        return Promise.resolve(true);
      },
    },
  };

  return {
    service: require(servicePath),
    state,
  };
};

const sumInc = (updates, fieldName) =>
  updates.reduce((total, item) => total + (Number(item.update?.$inc?.[fieldName]) || 0), 0);

const runSmoke = async () => {
  let fixture;
  try {
    fixture = await findRealSeriesFixture();
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
  }

  const { movie, episodes, episodeCount } = fixture;
  const [episodeOne, episodeTwo] = episodes;
  const { service, state } = installPlaybackMocks({ movie, episodes });

  const totalWatchSeconds = 2 * 60 * 60;
  const chunks = buildChunks(totalWatchSeconds);
  let viewHistoryId = null;

  for (const seconds of chunks) {
    const result = await service.recordPlaybackHeartbeat(movie.slug, {
      viewHistoryId,
      episodeId: toId(episodeOne._id),
      seconds,
      ipAddress: '203.0.113.24',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });

    assert.strictEqual(result.success, true);
    viewHistoryId = result.viewHistoryId;
  }

  assert.strictEqual(state.createdRecords.length, 1, '2-hour same-episode session must keep one ViewHistory record');
  assert.strictEqual(state.createdRecords[0].movieId, toId(movie._id));
  assert.strictEqual(state.createdRecords[0].episodeId, toId(episodeOne._id));
  assert.strictEqual(sumInc(state.viewUpdates, 'watchDuration'), totalWatchSeconds);
  assert.strictEqual(sumInc(state.movieUpdates, 'totalWatchTime'), totalWatchSeconds);
  assert.strictEqual(sumInc(state.movieUpdates, 'totalEpisodeWatchTime'), totalWatchSeconds);
  assert.strictEqual(sumInc(state.episodeUpdates, 'totalWatchTime'), totalWatchSeconds);

  const secondEpisodeResult = await service.recordPlaybackHeartbeat(movie.slug, {
    viewHistoryId,
    episodeId: toId(episodeTwo._id),
    seconds: 120,
    ipAddress: '203.0.113.24',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  });

  assert.strictEqual(secondEpisodeResult.success, true);
  assert.notStrictEqual(secondEpisodeResult.viewHistoryId, viewHistoryId);
  assert.strictEqual(state.createdRecords.length, 2, 'Switching episode must create/use a distinct ViewHistory record');
  assert.strictEqual(state.createdRecords[1].episodeId, toId(episodeTwo._id));

  console.log('REAL SERIES WATCH-TIME SMOKE PASS');
  console.log(`Movie: ${movie.name} (${movie.slug})`);
  console.log(`Type: ${movie.type || 'unknown'}, totalEpisodes=${movie.totalEpisodes || 'unknown'}, episodeDocs=${episodeCount}`);
  console.log(`Episode A: ${episodeOne.episodeId} / ${episodeOne.audioType || 'unknown'} / ${episodeOne.slug}`);
  console.log(`Episode B: ${episodeTwo.episodeId} / ${episodeTwo.audioType || 'unknown'} / ${episodeTwo.slug}`);
  console.log(`Simulated watch time: ${totalWatchSeconds}s = ${Math.round(totalWatchSeconds / 60)} minutes`);
  console.log('DB writes: none. Real DB was used only to read the movie and episode fixture.');
};

runSmoke().catch((error) => {
  console.error('REAL SERIES WATCH-TIME SMOKE FAIL');
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
