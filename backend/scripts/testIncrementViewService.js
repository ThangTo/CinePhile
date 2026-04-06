const assert = require('assert');
const path = require('path');

const servicePath = path.resolve(__dirname, '../services/movie.service.js');
const movieModelPath = path.resolve(__dirname, '../models/movie.model.js');
const episodeModelPath = path.resolve(__dirname, '../models/episode.model.js');
const viewHistoryPath = path.resolve(__dirname, '../models/view_history.model.js');
const redisServicePath = path.resolve(__dirname, '../services/redis.service.js');

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeQueryResult = (value) => ({
  select() {
    return this;
  },
  lean: async () => (value ? clone(value) : null),
});

const matchesQuery = (record, query) => {
  if (!record) return false;

  if (query.movieId && String(record.movieId) !== String(query.movieId)) {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(query, 'episodeId')) {
    const expectedEpisodeId = query.episodeId || null;
    const actualEpisodeId = record.episodeId || null;
    if (String(actualEpisodeId || '') !== String(expectedEpisodeId || '')) {
      return false;
    }
  }

  if (Object.prototype.hasOwnProperty.call(query, 'userId')) {
    const expectedUserId = query.userId || null;
    const actualUserId = record.userId || null;
    if (String(actualUserId || '') !== String(expectedUserId || '')) {
      return false;
    }
  }

  if (Object.prototype.hasOwnProperty.call(query, 'ipAddress') && record.ipAddress !== query.ipAddress) {
    return false;
  }

  if (query.createdAt?.$gte) {
    const createdAt = new Date(record.createdAt || 0);
    if (createdAt < query.createdAt.$gte) {
      return false;
    }
  }

  return true;
};

const installMocks = (state) => {
  delete require.cache[servicePath];
  delete require.cache[movieModelPath];
  delete require.cache[episodeModelPath];
  delete require.cache[viewHistoryPath];
  delete require.cache[redisServicePath];

  require.cache[movieModelPath] = {
    id: movieModelPath,
    filename: movieModelPath,
    loaded: true,
    exports: {
      findById(id) {
        return makeQueryResult(state.moviesById[id] || null);
      },
      findOne(query) {
        return makeQueryResult(state.moviesBySlug[query.slug] || null);
      },
      findByIdAndUpdate(id, update) {
        state.movieUpdates.push({ id, update: clone(update) });
        if (update?.$inc?.viewCount) {
          state.moviesById[id].viewCount = (state.moviesById[id].viewCount || 0) + update.$inc.viewCount;
        }
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
      findOne(query) {
        const record = state.viewRecords.find((item) => matchesQuery(item, query)) || null;
        return {
          lean: async () => (record ? clone(record) : null),
        };
      },
      findByIdAndUpdate(id, update) {
        state.viewUpdates.push({ id, update: clone(update) });
        const record = state.viewRecords.find((item) => String(item._id) === String(id));
        if (record && update?.$set?.userId) {
          record.userId = update.$set.userId;
        }
        return Promise.resolve({ _id: id });
      },
      create(doc) {
        const createdId = `vh-${state.createdRecords.length + 1}`;
        const created = {
          _id: createdId,
          createdAt: new Date(),
          ...clone(doc),
        };
        state.createdRecords.push(created);
        state.viewRecords.push(created);
        return Promise.resolve(clone(created));
      },
    },
  };

  require.cache[redisServicePath] = {
    id: redisServicePath,
    filename: redisServicePath,
    loaded: true,
    exports: {
      isConnected: false,
      client: null,
    },
  };

  return require(servicePath);
};

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

const makeState = () => ({
  moviesById: {},
  moviesBySlug: {},
  viewRecords: [],
  createdRecords: [],
  movieUpdates: [],
  episodeUpdates: [],
  viewUpdates: [],
});

(async () => {
  await run('reuses and claims a recent anonymous episode view instead of double-counting it', async () => {
    const state = makeState();
    state.moviesById['movie-1'] = { _id: 'movie-1', slug: 'movie-slug', viewCount: 12 };
    state.moviesBySlug['movie-slug'] = state.moviesById['movie-1'];
    state.viewRecords.push({
      _id: 'vh-guest',
      movieId: 'movie-1',
      episodeId: 'episode-1',
      userId: null,
      ipAddress: '1.2.3.4',
      createdAt: new Date(),
    });

    const service = installMocks(state);
    const result = await service.incrementView('movie-slug', {
      episodeId: 'episode-1',
      userId: 'user-1',
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });

    assert.strictEqual(result.viewHistoryId, 'vh-guest');
    assert.strictEqual(result.showCounted, false);
    assert.strictEqual(result.episodeCounted, false);
    assert.strictEqual(result.viewCount, 12);
    assert.deepStrictEqual(state.createdRecords, []);
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-guest', update: { $set: { userId: 'user-1' } } },
    ]);
    assert.deepStrictEqual(state.movieUpdates, []);
    assert.deepStrictEqual(state.episodeUpdates, []);
  });
})();
