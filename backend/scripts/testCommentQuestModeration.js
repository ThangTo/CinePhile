const assert = require('assert');
const path = require('path');
const Module = require('module');

function createCommentModelHarness() {
  const comments = [];
  let nextId = 1;

  const matchesQuery = (doc, query = {}) =>
    Object.entries(query).every(([key, value]) => {
      const currentValue = doc[key];

      if (value === null) {
        return currentValue === null || typeof currentValue === 'undefined';
      }

      return currentValue === value;
    });

  const applyUpdate = (doc, update = {}) => {
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
  };

  const cloneComment = (doc) => ({
    ...doc,
    populate: async () => ({
      toObject: () => ({ ...doc }),
    }),
    toObject: () => ({ ...doc }),
  });

  const Comment = {
    async create(doc) {
      const created = {
        _id: `comment-${nextId++}`,
        episodeId: null,
        likes: 0,
        dislikes: 0,
        questProgressGrantedAt: null,
        createdAt: new Date(),
        ...doc,
      };
      comments.push(created);
      return cloneComment(created);
    },
    async findOneAndUpdate(query, update, options = {}) {
      const target = comments.find((doc) => matchesQuery(doc, query));
      if (!target) return null;
      const previous = { ...target };
      applyUpdate(target, update);
      return options.new ? { ...target } : previous;
    },
    async updateOne(query, update) {
      const target = comments.find((doc) => matchesQuery(doc, query));
      if (!target) {
        return { modifiedCount: 0 };
      }
      applyUpdate(target, update);
      return { modifiedCount: 1 };
    },
    async findByIdAndUpdate(id, update, options = {}) {
      const target = comments.find((doc) => doc._id === id);
      if (!target) return null;
      const previous = { ...target };
      Object.assign(target, update);
      return options.new ? { ...target } : previous;
    },
  };

  return { Comment, comments };
}

function loadModuleWithMocks(modulePath, mocks) {
  delete require.cache[modulePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

async function main() {
  await runTest('grantCommentQuestProgress only awards once for allowed comments', async () => {
    const { Comment, comments } = createCommentModelHarness();
    const questCalls = [];
    const servicePath = path.resolve(__dirname, '../services/commentQuest.service.js');
    const commentQuestService = loadModuleWithMocks(servicePath, {
      '../models/comment.model': Comment,
      './quest.service': {
        async checkAndUpdateProgress(userId, event) {
          questCalls.push({ userId, event });
        },
      },
    });

    comments.push({
      _id: 'comment-1',
      userId: 'user-1',
      movieId: 'movie-1',
      status: 'allowed',
      questProgressGrantedAt: null,
    });

    const firstGrant = await commentQuestService.grantCommentQuestProgress('comment-1');
    const secondGrant = await commentQuestService.grantCommentQuestProgress('comment-1');

    assert.equal(firstGrant.awarded, true);
    assert.equal(secondGrant.awarded, false);
    assert.equal(questCalls.length, 1);
    assert.ok(comments[0].questProgressGrantedAt instanceof Date);
  });

  await runTest('postComment does not award quest progress for pending comments', async () => {
    const { Comment, comments } = createCommentModelHarness();
    const questCalls = [];
    const movieServicePath = path.resolve(__dirname, '../services/movie.service.js');
    const movieService = loadModuleWithMocks(movieServicePath, {
      mongoose: {
        Types: {
          ObjectId: {
            isValid: () => false,
          },
        },
      },
      '../models/movie.model': {
        findOne() {
          return {
            lean: async () => ({ _id: 'movie-2', slug: 'movie-2' }),
          };
        },
      },
      '../models/genre.model': {},
      '../models/country.model': {},
      '../models/episode.model': {},
      '../models/cast.model': {},
      '../models/comment.model': Comment,
      '../models/rating.model': {},
      './redis.service': { isConnected: false },
      '../utils/movieTransformer': {
        transformMovie: (value) => value,
        transformMovies: (value) => value,
        transformPaginatedResult: (value) => value,
      },
      '../utils/castUtils': {
        isLatinName: () => false,
      },
      '../utils/avatarUtils': {
        normalizeAvatarForOutput: () => null,
      },
      './moderation.service': {
        async checkComment() {
          return { flag: 'toxic', reason: 'Detected toxic content' };
        },
      },
      './commentQuest.service': {
        async grantCommentQuestProgress(commentId) {
          questCalls.push(commentId);
          return { awarded: true };
        },
      },
    });

    const result = await movieService.postComment('movie-2', 'user-2', {
      content: 'bad comment',
    });

    assert.equal(result.status, 'pending');
    assert.equal(questCalls.length, 0);
    assert.equal(comments[0].status, 'pending');
    assert.equal(comments[0].questProgressGrantedAt, null);
  });

  await runTest('postComment awards quest progress immediately for allowed comments', async () => {
    const { Comment, comments } = createCommentModelHarness();
    const grantedCommentIds = [];
    const movieServicePath = path.resolve(__dirname, '../services/movie.service.js');
    const movieService = loadModuleWithMocks(movieServicePath, {
      mongoose: {
        Types: {
          ObjectId: {
            isValid: () => false,
          },
        },
      },
      '../models/movie.model': {
        findOne() {
          return {
            lean: async () => ({ _id: 'movie-3', slug: 'movie-3' }),
          };
        },
      },
      '../models/genre.model': {},
      '../models/country.model': {},
      '../models/episode.model': {},
      '../models/cast.model': {},
      '../models/comment.model': Comment,
      '../models/rating.model': {},
      './redis.service': { isConnected: false },
      '../utils/movieTransformer': {
        transformMovie: (value) => value,
        transformMovies: (value) => value,
        transformPaginatedResult: (value) => value,
      },
      '../utils/castUtils': {
        isLatinName: () => false,
      },
      '../utils/avatarUtils': {
        normalizeAvatarForOutput: () => null,
      },
      './moderation.service': {
        async checkComment() {
          return { flag: null, reason: null };
        },
      },
      './commentQuest.service': {
        async grantCommentQuestProgress(commentId) {
          grantedCommentIds.push(commentId);
          const target = comments.find((doc) => doc._id === commentId);
          target.questProgressGrantedAt = new Date();
          return { awarded: true };
        },
      },
    });

    const result = await movieService.postComment('movie-3', 'user-3', {
      content: 'safe comment',
    });

    assert.equal(result.status, 'allowed');
    assert.equal(grantedCommentIds.length, 1);
    assert.ok(comments[0].questProgressGrantedAt instanceof Date);
  });

  await runTest('admin approval retries safely and only grants once', async () => {
    const { Comment, comments } = createCommentModelHarness();
    const awardStates = [];
    const controllerPath = path.resolve(__dirname, '../controllers/admin.comment.controller.js');
    const controller = loadModuleWithMocks(controllerPath, {
      '../models/comment.model': Comment,
      '../services/commentQuest.service': {
        async grantCommentQuestProgress(commentId) {
          const target = comments.find((doc) => doc._id === commentId);
          if (!target || target.status !== 'allowed' || target.questProgressGrantedAt) {
            awardStates.push(false);
            return { awarded: false };
          }
          target.questProgressGrantedAt = new Date();
          awardStates.push(true);
          return { awarded: true };
        },
      },
    });

    comments.push({
      _id: 'comment-4',
      userId: 'user-4',
      movieId: 'movie-4',
      content: 'waiting approval',
      status: 'pending',
      flag: 'toxic',
      flagReason: 'reason',
      questProgressGrantedAt: null,
    });

    const responses = [];
    const res = {
      status(code) {
        responses.push({ type: 'status', code });
        return this;
      },
      json(payload) {
        responses.push({ type: 'json', payload });
        return this;
      },
    };

    await controller.updateStatus(
      {
        params: { id: 'comment-4' },
        body: { status: 'allowed' },
      },
      res,
    );

    await controller.updateStatus(
      {
        params: { id: 'comment-4' },
        body: { status: 'allowed' },
      },
      res,
    );

    assert.deepEqual(awardStates, [true, false]);
    assert.ok(comments[0].questProgressGrantedAt instanceof Date);
    assert.equal(responses.filter((item) => item.type === 'status').length, 0);
    assert.equal(comments[0].flag, null);
    assert.equal(comments[0].flagReason, null);
  });
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
