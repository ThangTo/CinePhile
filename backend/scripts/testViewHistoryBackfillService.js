const assert = require('assert');

const {
  buildBackfillPlan,
} = require('../services/viewHistoryBackfill.service');

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
  await run('matches a guest view to the closest compatible user history', async () => {
    const guestViews = [
      {
        _id: 'view-1',
        movieId: 'movie-1',
        episodeId: 'ep-1',
        userId: null,
        watchDuration: 900,
        createdAt: new Date('2026-04-06T10:00:00.000Z'),
      },
    ];

    const userHistories = [
      {
        _id: 'history-1',
        userId: 'user-1',
        movieId: 'movie-1',
        episodeId: 'ep-1',
        watchTime: 1200,
        lastWatchedAt: new Date('2026-04-06T10:16:00.000Z'),
      },
    ];

    const plan = buildBackfillPlan(guestViews, userHistories);

    assert.strictEqual(plan.updates.length, 1);
    assert.strictEqual(plan.updates[0].viewHistoryId, 'view-1');
    assert.strictEqual(plan.updates[0].userId, 'user-1');
    assert.strictEqual(plan.skipped.length, 0);
  });

  await run('skips ambiguous rows when two users are equally plausible', async () => {
    const guestViews = [
      {
        _id: 'view-2',
        movieId: 'movie-1',
        episodeId: 'ep-1',
        userId: null,
        watchDuration: 600,
        createdAt: new Date('2026-04-06T12:00:00.000Z'),
      },
    ];

    const userHistories = [
      {
        _id: 'history-a',
        userId: 'user-a',
        movieId: 'movie-1',
        episodeId: 'ep-1',
        watchTime: 700,
        lastWatchedAt: new Date('2026-04-06T12:09:00.000Z'),
      },
      {
        _id: 'history-b',
        userId: 'user-b',
        movieId: 'movie-1',
        episodeId: 'ep-1',
        watchTime: 700,
        lastWatchedAt: new Date('2026-04-06T12:10:00.000Z'),
      },
    ];

    const plan = buildBackfillPlan(guestViews, userHistories, {
      ambiguityMs: 2 * 60 * 1000,
    });

    assert.strictEqual(plan.updates.length, 0);
    assert.strictEqual(plan.skipped.length, 1);
    assert.strictEqual(plan.skipped[0].reason, 'ambiguous_candidate');
  });

  await run('limits one guest view per user history to avoid bulk mis-attribution', async () => {
    const guestViews = [
      {
        _id: 'view-3',
        movieId: 'movie-2',
        episodeId: null,
        userId: null,
        watchDuration: 400,
        createdAt: new Date('2026-04-06T14:00:00.000Z'),
      },
      {
        _id: 'view-4',
        movieId: 'movie-2',
        episodeId: null,
        userId: null,
        watchDuration: 450,
        createdAt: new Date('2026-04-06T14:05:00.000Z'),
      },
    ];

    const userHistories = [
      {
        _id: 'history-2',
        userId: 'user-2',
        movieId: 'movie-2',
        episodeId: null,
        watchTime: 900,
        lastWatchedAt: new Date('2026-04-06T14:08:00.000Z'),
      },
    ];

    const plan = buildBackfillPlan(guestViews, userHistories);

    assert.strictEqual(plan.updates.length, 1);
    assert.strictEqual(plan.skipped.length, 1);
    assert.strictEqual(plan.skipped[0].reason, 'candidate_conflict');
  });

  await run('rejects histories that are too far away in time', async () => {
    const guestViews = [
      {
        _id: 'view-5',
        movieId: 'movie-3',
        episodeId: 'ep-9',
        userId: null,
        watchDuration: 300,
        createdAt: new Date('2026-04-06T08:00:00.000Z'),
      },
    ];

    const userHistories = [
      {
        _id: 'history-3',
        userId: 'user-3',
        movieId: 'movie-3',
        episodeId: 'ep-9',
        watchTime: 400,
        lastWatchedAt: new Date('2026-04-07T08:00:00.000Z'),
      },
    ];

    const plan = buildBackfillPlan(guestViews, userHistories, {
      maxLagMinutes: 30,
    });

    assert.strictEqual(plan.updates.length, 0);
    assert.strictEqual(plan.skipped.length, 1);
    assert.strictEqual(plan.skipped[0].reason, 'no_candidate');
  });

  await run('rejects candidates whose score is beyond the confidence threshold', async () => {
    const guestViews = [
      {
        _id: 'view-6',
        movieId: 'movie-4',
        episodeId: null,
        userId: null,
        watchDuration: 60,
        createdAt: new Date('2026-04-06T08:00:00.000Z'),
      },
    ];

    const userHistories = [
      {
        _id: 'history-4',
        userId: 'user-4',
        movieId: 'movie-4',
        episodeId: null,
        watchTime: 500,
        lastWatchedAt: new Date('2026-04-06T08:12:00.000Z'),
      },
    ];

    const plan = buildBackfillPlan(guestViews, userHistories, {
      maxScoreMs: 2 * 60 * 1000,
    });

    assert.strictEqual(plan.updates.length, 0);
    assert.strictEqual(plan.skipped.length, 1);
    assert.strictEqual(plan.skipped[0].reason, 'no_candidate');
  });
})();
