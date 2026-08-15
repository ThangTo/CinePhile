const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const crawlerServicePath = require.resolve('./crawler.service');

const detailResponse = {
  data: {
    movie: {
      _id: 'source-movie-1',
      name: 'Crawler test movie',
      slug: 'crawler-test-movie',
      origin_name: 'Crawler test movie',
      content: '',
      type: 'single',
      status: 'completed',
      thumb_url: '',
      poster_url: '',
      trailer_url: '',
      time: '90 minutes',
      year: 2026,
      lang: 'Vietsub',
      quality: 'HD',
      episode_current: 'Full',
      episode_total: '1',
      category: [],
      country: [],
      actor: [],
      director: [],
    },
    episodes: [],
  },
};

const createFindOneQuery = (result) => ({
  then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  select: () => ({ lean: async () => result }),
});

const createUpdateQuery = (result) => ({
  then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  lean: async () => result,
});

const loadCrawlerService = () => {
  const notificationCalls = [];
  const savedMovie = { _id: 'movie-1', tmdb: null };
  const originalLoad = Module._load;

  const MovieModel = {
    findOne: () => createFindOneQuery(null),
    findOneAndUpdate: () => createUpdateQuery(savedMovie),
    updateOne: async () => ({}),
  };

  const taxonomyModel = { findOneAndUpdate: async () => ({}) };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'axios') {
      return {
        get: async (url) =>
          url.includes('/danh-sach/phim-moi-cap-nhat')
            ? { data: { items: [{ slug: 'crawler-test-movie' }] } }
            : detailResponse,
      };
    }
    if (request === 'he') return { decode: (value) => value };
    if (request === '../models/movie.model') return MovieModel;
    if (request === '../models/episode.model') return { findOneAndUpdate: async () => ({}) };
    if (request === '../models/genre.model' || request === '../models/country.model') return taxonomyModel;
    if (request === '../integrations/cast.service') {
      return { ensureCastForNames: async () => [], ensureCastFromTmdbId: async () => [] };
    }
    if (request === '../integrations/tmdb.service') return { getMovieImages: async () => null };
    if (request === '../utils/movieAdminUtils') return { slugify: (value) => value };
    if (request === '../controllers/notification.controller') {
      return { createNotification: async (payload) => notificationCalls.push(payload) };
    }
    if (request === '../middleware/cache.middleware') return { invalidateMovieCache: async () => {} };
    if (request === '../utils/episodeNumber.util') return { extractEpisodeNumber: (value) => value };
    if (request === './redis.service') return {};
    return originalLoad(request, parent, isMain);
  };

  delete require.cache[crawlerServicePath];
  return {
    crawlerService: require(crawlerServicePath),
    notificationCalls,
    restore: () => {
      Module._load = originalLoad;
    },
  };
};

/**
 * User journey: a scheduled or admin crawl stores a movie without creating a
 * broadcast notification for every user.
 */
test('crawlMovies does not broadcast a notification for a crawled movie', async () => {
  const { crawlerService, notificationCalls, restore } = loadCrawlerService();

  try {
    const result = await crawlerService.crawlMovies(1);

    assert.equal(result.movies_count, 1);
    assert.equal(notificationCalls.length, 0);
  } finally {
    restore();
  }
});

test('crawlMovieBySlug does not broadcast a notification for a crawled movie', async () => {
  const { crawlerService, notificationCalls, restore } = loadCrawlerService();

  try {
    const result = await crawlerService.crawlMovieBySlug('crawler-test-movie');

    assert.equal(result.success, true);
    assert.equal(notificationCalls.length, 0);
  } finally {
    restore();
  }
});
