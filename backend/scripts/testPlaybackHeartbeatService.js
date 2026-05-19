const assert = require('assert');
const path = require('path');

const servicePath = path.resolve(__dirname, '../services/playbackHeartbeat.service.js');
const movieModelPath = path.resolve(__dirname, '../models/movie.model.js');
const episodeModelPath = path.resolve(__dirname, '../models/episode.model.js');
const viewHistoryPath = path.resolve(__dirname, '../models/view_history.model.js');
const userHistoryPath = path.resolve(__dirname, '../models/user_history.model.js');
const streakServicePath = path.resolve(__dirname, '../services/watchStreak.service.js');
const questServicePath = path.resolve(__dirname, '../services/quest.service.js');
const leaderboardServicePath = path.resolve(__dirname, '../services/leaderboard.service.js');

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeLeanResult = (value) => ({
  lean: async () => (value ? clone(value) : null),
});

const installMocks = (state) => {
  delete require.cache[servicePath];
  delete require.cache[movieModelPath];
  delete require.cache[episodeModelPath];
  delete require.cache[viewHistoryPath];
  delete require.cache[userHistoryPath];
  delete require.cache[streakServicePath];
  delete require.cache[questServicePath];
  delete require.cache[leaderboardServicePath];

  require.cache[movieModelPath] = {
    id: movieModelPath,
    filename: movieModelPath,
    loaded: true,
    exports: {
      findById(id) {
        state.movieFindByIdCalls += 1;
        return makeLeanResult(state.moviesById?.[id] || null);
      },
      findOne(query) {
        state.movieFindOneCalls += 1;
        return makeLeanResult(state.moviesBySlug?.[query.slug] || null);
      },
      findByIdAndUpdate(id, update) {
        state.movieUpdates.push({ id, update: clone(update) });
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
        state.episodeUpdates.push({ id, update: clone(update) });
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
        return makeLeanResult(state.viewRecordsById?.[id] || null);
      },
      findOne(query) {
        const match = (state.recentViewRecords || []).find((record) => {
          if (String(record.movieId) !== String(query.movieId)) return false;
          if ((query.episodeId || null) !== (record.episodeId || null)) return false;
          if (query.userId && String(record.userId) !== String(query.userId)) return false;
          if (query.ipAddress && record.ipAddress !== query.ipAddress) return false;
          return true;
        });

        return {
          sort() {
            return makeLeanResult(match || null);
          },
        };
      },
      create(doc) {
        const createdId = `vh-${state.createdRecords.length + 1}`;
        const created = {
          _id: createdId,
          ...clone(doc),
        };

        state.createdRecords.push(created);
        state.viewRecordsById[createdId] = created;
        return Promise.resolve(clone(created));
      },
      findByIdAndUpdate(id, update) {
        state.viewUpdates.push({ id, update: clone(update) });
        return Promise.resolve({ _id: id });
      },
    },
  };

  require.cache[userHistoryPath] = {
    id: userHistoryPath,
    filename: userHistoryPath,
    loaded: true,
    exports: {
      findOneAndUpdate(query, update, options) {
        state.userHistoryUpdates.push({
          query: clone(query),
          update: clone(update),
          options: clone(options),
        });
        return Promise.resolve({ _id: 'history-1', ...clone(query), ...clone(update) });
      },
    },
  };

  require.cache[streakServicePath] = {
    id: streakServicePath,
    filename: streakServicePath,
    loaded: true,
    exports: {
      recordStreak(userId, secondsWatched) {
        state.streakCalls.push({ userId, secondsWatched });
        return Promise.resolve({
          currentStreak: 2,
          longestStreak: 4,
          minutesWatchedToday: Math.floor(secondsWatched / 60),
        });
      },
    },
  };

  require.cache[leaderboardServicePath] = {
    id: leaderboardServicePath,
    filename: leaderboardServicePath,
    loaded: true,
    exports: {
      invalidateLeaderboardCache() {
        state.leaderboardInvalidations += 1;
        return Promise.resolve(true);
      },
    },
  };

  require.cache[questServicePath] = {
    id: questServicePath,
    filename: questServicePath,
    loaded: true,
    exports: {
      checkAndUpdateProgress(userId, payload) {
        state.questCalls.push({ userId, payload: clone(payload) });
        return Promise.resolve(null);
      },
    },
  };

  return require(servicePath);
};

const makeState = () => ({
  moviesById: {},
  moviesBySlug: {},
  viewRecordsById: {},
  recentViewRecords: [],
  createdRecords: [],
  movieUpdates: [],
  episodeUpdates: [],
  viewUpdates: [],
  userHistoryUpdates: [],
  streakCalls: [],
  questCalls: [],
  leaderboardInvalidations: 0,
  movieFindByIdCalls: 0,
  movieFindOneCalls: 0,
});

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
};

(async () => {
  await run('creates a view record and updates watch time + streak together', async () => {
    const state = makeState();
    state.moviesBySlug['movie-slug'] = { _id: 'movie-1', slug: 'movie-slug' };

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      episodeId: 'episode-1',
      seconds: 25,
      userId: 'user-1',
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0 Mobile',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.viewHistoryId, 'vh-1');
    assert.strictEqual(result.streak.currentStreak, 2);
    assert.strictEqual(state.createdRecords.length, 1);
    assert.strictEqual(state.createdRecords[0].movieId, 'movie-1');
    assert.strictEqual(state.createdRecords[0].episodeId, 'episode-1');
    assert.strictEqual(state.createdRecords[0].userId, 'user-1');
    assert.strictEqual(state.createdRecords[0].deviceType, 'Mobile');
    assert.deepStrictEqual(state.streakCalls, [{ userId: 'user-1', secondsWatched: 25 }]);
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-1', update: { $inc: { watchDuration: 25 } } },
    ]);
    assert.strictEqual(state.userHistoryUpdates.length, 1);
    assert.deepStrictEqual(state.userHistoryUpdates[0].query, {
      userId: 'user-1',
      movieId: 'movie-1',
    });
    assert.strictEqual(state.userHistoryUpdates[0].update.episodeId, 'episode-1');
    assert.strictEqual(state.userHistoryUpdates[0].update.watchTime, 25);
    assert.strictEqual(state.userHistoryUpdates[0].options.upsert, true);
    assert.strictEqual(state.movieUpdates.length, 2);
    assert.strictEqual(state.episodeUpdates.length, 1);
    assert.strictEqual(state.leaderboardInvalidations, 1);
  });

  await run('uses explicit playback position and duration when syncing user history', async () => {
    const state = makeState();
    state.moviesBySlug['movie-slug'] = { _id: 'movie-progress', slug: 'movie-slug' };
    state.viewRecordsById['vh-progress'] = {
      _id: 'vh-progress',
      movieId: 'movie-progress',
      episodeId: 'episode-progress',
      userId: 'user-progress',
      ipAddress: '3.3.3.3',
      watchDuration: 120,
    };

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      viewHistoryId: 'vh-progress',
      episodeId: 'episode-progress',
      seconds: 30,
      userId: 'user-progress',
      watchTime: 600,
      duration: 2400,
      ipAddress: '3.3.3.3',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(state.userHistoryUpdates.length, 1);
    assert.deepStrictEqual(state.userHistoryUpdates[0].query, {
      userId: 'user-progress',
      movieId: 'movie-progress',
    });
    assert.strictEqual(state.userHistoryUpdates[0].update.episodeId, 'episode-progress');
    assert.strictEqual(state.userHistoryUpdates[0].update.watchTime, 600);
    assert.strictEqual(state.userHistoryUpdates[0].update.duration, 2400);
    assert.strictEqual(state.userHistoryUpdates[0].update.progress, 25);
    assert.ok(state.userHistoryUpdates[0].update.lastWatchedAt);
  });

  await run('reuses a matching view history id without creating duplicates', async () => {
    const state = makeState();
    state.viewRecordsById['vh-99'] = {
      _id: 'vh-99',
      movieId: 'movie-99',
      episodeId: 'episode-2',
      userId: 'user-2',
      ipAddress: '8.8.8.8',
    };
    state.moviesBySlug['movie-slug'] = { _id: 'movie-99', slug: 'movie-slug' };

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      viewHistoryId: 'vh-99',
      episodeId: 'episode-2',
      seconds: 60,
      ipAddress: '8.8.8.8',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.viewHistoryId, 'vh-99');
    assert.strictEqual(state.createdRecords.length, 0);
    assert.deepStrictEqual(state.streakCalls, []);
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-99', update: { $inc: { watchDuration: 60 } } },
    ]);
    assert.strictEqual(state.leaderboardInvalidations, 0);
  });

  await run('reuses a matching object id heartbeat without an extra movie lookup', async () => {
    const state = makeState();
    const movieId = '507f1f77bcf86cd799439011';
    state.viewRecordsById['vh-fast-path'] = {
      _id: 'vh-fast-path',
      movieId,
      episodeId: null,
      userId: null,
      ipAddress: '8.8.4.4',
    };

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat(movieId, {
      viewHistoryId: 'vh-fast-path',
      seconds: 60,
      ipAddress: '8.8.4.4',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.viewHistoryId, 'vh-fast-path');
    assert.strictEqual(state.createdRecords.length, 0);
    assert.strictEqual(state.movieFindByIdCalls, 0);
    assert.strictEqual(state.movieFindOneCalls, 0);
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-fast-path', update: { $inc: { watchDuration: 60 } } },
    ]);
    assert.deepStrictEqual(state.movieUpdates, [
      { id: movieId, update: { $inc: { totalWatchTime: 60 } } },
    ]);
  });

  await run('falls back to a recent matching record when the supplied id points to another episode', async () => {
    const state = makeState();
    state.viewRecordsById['vh-old'] = {
      _id: 'vh-old',
      movieId: 'movie-1',
      episodeId: 'episode-old',
      userId: 'user-3',
      ipAddress: '9.9.9.9',
    };
    state.moviesBySlug['movie-slug'] = { _id: 'movie-1', slug: 'movie-slug' };
    state.recentViewRecords.push({
      _id: 'vh-new',
      movieId: 'movie-1',
      episodeId: 'episode-new',
      userId: 'user-3',
      ipAddress: '9.9.9.9',
    });

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      viewHistoryId: 'vh-old',
      episodeId: 'episode-new',
      seconds: 15,
      userId: 'user-3',
      ipAddress: '9.9.9.9',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.viewHistoryId, 'vh-new');
    assert.strictEqual(state.createdRecords.length, 0);
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-new', update: { $inc: { watchDuration: 15 } } },
    ]);
    assert.deepStrictEqual(state.streakCalls, [{ userId: 'user-3', secondsWatched: 15 }]);
    assert.strictEqual(state.leaderboardInvalidations, 1);
  });

  await run('does not reuse a supplied view history id from another movie', async () => {
    const state = makeState();
    state.viewRecordsById['vh-old-movie'] = {
      _id: 'vh-old-movie',
      movieId: 'movie-old',
      episodeId: null,
      userId: 'user-4',
      ipAddress: '7.7.7.7',
    };
    state.moviesBySlug['movie-slug'] = { _id: 'movie-new', slug: 'movie-slug' };

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      viewHistoryId: 'vh-old-movie',
      seconds: 30,
      userId: 'user-4',
      ipAddress: '7.7.7.7',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.viewHistoryId, 'vh-1');
    assert.strictEqual(state.createdRecords.length, 1);
    assert.strictEqual(state.createdRecords[0].movieId, 'movie-new');
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-1', update: { $inc: { watchDuration: 30 } } },
    ]);
    assert.deepStrictEqual(state.movieUpdates, [
      { id: 'movie-new', update: { $inc: { totalWatchTime: 30 } } },
    ]);
  });

  await run('accepts a delayed heartbeat up to five minutes', async () => {
    const state = makeState();
    state.viewRecordsById['vh-delayed'] = {
      _id: 'vh-delayed',
      movieId: 'movie-delayed',
      episodeId: null,
      userId: 'user-delayed',
      ipAddress: '6.6.6.6',
    };
    state.moviesBySlug['movie-slug'] = { _id: 'movie-delayed', slug: 'movie-slug' };

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      viewHistoryId: 'vh-delayed',
      seconds: 900,
      userId: 'user-delayed',
      ipAddress: '6.6.6.6',
    });

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-delayed', update: { $inc: { watchDuration: 300 } } },
    ]);
    assert.deepStrictEqual(state.streakCalls, [{ userId: 'user-delayed', secondsWatched: 300 }]);
    assert.strictEqual(state.questCalls.length, 1);
    assert.strictEqual(state.questCalls[0].payload.seconds, 300);
  });

  await run('records a two hour series episode session without undercounting', async () => {
    const state = makeState();
    state.moviesBySlug['series-slug'] = { _id: 'movie-series', slug: 'series-slug' };

    const service = installMocks(state);
    let viewHistoryId = null;
    const chunks = [60, 92, 180, 300, 75, 244, 60, 299, 121, 300];
    let totalSeconds = 0;

    while (totalSeconds < 7200) {
      const nextSeconds = Math.min(chunks[state.viewUpdates.length % chunks.length], 7200 - totalSeconds);
      const result = await service.recordPlaybackHeartbeat('series-slug', {
        viewHistoryId,
        episodeId: 'episode-series-1',
        seconds: nextSeconds,
        ipAddress: '10.0.0.8',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      assert.strictEqual(result.success, true);
      viewHistoryId = result.viewHistoryId;
      totalSeconds += nextSeconds;
    }

    const sumInc = (updates, fieldName) =>
      updates.reduce((total, item) => total + (Number(item.update?.$inc?.[fieldName]) || 0), 0);

    assert.strictEqual(state.createdRecords.length, 1);
    assert.strictEqual(state.createdRecords[0].movieId, 'movie-series');
    assert.strictEqual(state.createdRecords[0].episodeId, 'episode-series-1');
    assert.strictEqual(sumInc(state.viewUpdates, 'watchDuration'), 7200);
    assert.strictEqual(sumInc(state.movieUpdates, 'totalWatchTime'), 7200);
    assert.strictEqual(sumInc(state.movieUpdates, 'totalEpisodeWatchTime'), 7200);
    assert.strictEqual(sumInc(state.episodeUpdates, 'totalWatchTime'), 7200);
  });

  await run('claims an anonymous view record for the authenticated user before adding watch time', async () => {
    const state = makeState();
    state.viewRecordsById['vh-guest'] = {
      _id: 'vh-guest',
      movieId: 'movie-guest',
      episodeId: 'episode-guest',
      userId: null,
      ipAddress: '5.5.5.5',
    };
    state.moviesBySlug['movie-slug'] = { _id: 'movie-guest', slug: 'movie-slug' };

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      viewHistoryId: 'vh-guest',
      episodeId: 'episode-guest',
      seconds: 20,
      userId: 'user-guest',
      ipAddress: '5.5.5.5',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.viewHistoryId, 'vh-guest');
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-guest', update: { $set: { userId: 'user-guest' } } },
      { id: 'vh-guest', update: { $inc: { watchDuration: 20 } } },
    ]);
    assert.deepStrictEqual(state.streakCalls, [{ userId: 'user-guest', secondsWatched: 20 }]);
    assert.strictEqual(state.leaderboardInvalidations, 1);
  });
})();
