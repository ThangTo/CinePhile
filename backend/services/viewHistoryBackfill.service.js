const DEFAULT_OPTIONS = {
  maxLeadMinutes: 20,
  maxLagMinutes: 180,
  ambiguityMs: 5 * 60 * 1000,
  maxScoreMs: 15 * 60 * 1000,
  watchTimeSlackSeconds: 120,
  minGuestWatchSeconds: 0,
  maxGuestViewsPerHistory: 1,
};

const toIdString = (value) => {
  if (!value) return null;
  return typeof value === 'string' ? value : value.toString();
};

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildMovieEpisodeKey = (movieId, episodeId) =>
  `${toIdString(movieId) || 'null'}:${toIdString(episodeId) || 'null'}`;

const getHistoryEventTime = (history) =>
  toDate(history?.lastWatchedAt || history?.updatedAt || history?.createdAt);

const getSessionBounds = (view) => {
  const start = toDate(view?.createdAt);
  if (!start) {
    return null;
  }

  const safeDurationSeconds = Math.max(0, Number(view?.watchDuration) || 0);
  const end = new Date(start.getTime() + safeDurationSeconds * 1000);
  return {
    start,
    end: end.getTime() >= start.getTime() ? end : start,
  };
};

const isWatchTimeCompatible = (view, history, options) => {
  const guestSeconds = Math.max(0, Number(view?.watchDuration) || 0);
  const historyWatchTime = Number(history?.watchTime);

  if (!guestSeconds || !Number.isFinite(historyWatchTime) || historyWatchTime <= 0) {
    return true;
  }

  return historyWatchTime + options.watchTimeSlackSeconds >= guestSeconds;
};

const scoreCandidate = (view, history, options) => {
  if (!view || !history) {
    return null;
  }

  if (toIdString(view.userId) || !toIdString(view._id)) {
    return null;
  }

  if (buildMovieEpisodeKey(view.movieId, view.episodeId) !== buildMovieEpisodeKey(history.movieId, history.episodeId)) {
    return null;
  }

  const session = getSessionBounds(view);
  const eventTime = getHistoryEventTime(history);
  if (!session || !eventTime) {
    return null;
  }

  if (!isWatchTimeCompatible(view, history, options)) {
    return null;
  }

  const lowerBound = session.start.getTime() - options.maxLeadMinutes * 60 * 1000;
  const upperBound = session.end.getTime() + options.maxLagMinutes * 60 * 1000;
  const eventMs = eventTime.getTime();
  if (eventMs < lowerBound || eventMs > upperBound) {
    return null;
  }

  const distanceToWindowMs =
    eventMs < session.start.getTime()
      ? session.start.getTime() - eventMs
      : eventMs > session.end.getTime()
        ? eventMs - session.end.getTime()
        : 0;

  const distanceToEndMs = Math.abs(eventMs - session.end.getTime());
  const scoreMs = distanceToWindowMs * 10 + distanceToEndMs;
  if (scoreMs > options.maxScoreMs) {
    return null;
  }

  return {
    viewHistoryId: toIdString(view._id),
    userHistoryId: toIdString(history._id),
    userId: toIdString(history.userId),
    scoreMs,
    distanceToWindowMs,
    distanceToEndMs,
    view,
    history,
  };
};

const buildBackfillPlan = (guestViews = [], userHistories = [], rawOptions = {}) => {
  const options = {
    ...DEFAULT_OPTIONS,
    ...rawOptions,
  };

  const historiesByKey = new Map();
  for (const history of userHistories) {
    const key = buildMovieEpisodeKey(history.movieId, history.episodeId);
    if (!historiesByKey.has(key)) {
      historiesByKey.set(key, []);
    }
    historiesByKey.get(key).push(history);
  }

  const skipped = [];
  const perViewCandidates = new Map();

  for (const view of guestViews) {
    const viewId = toIdString(view?._id);
    if (!viewId) {
      continue;
    }

    if (toIdString(view.userId)) {
      skipped.push({ viewHistoryId: viewId, reason: 'already_has_user' });
      continue;
    }

    if ((Number(view.watchDuration) || 0) < options.minGuestWatchSeconds) {
      skipped.push({ viewHistoryId: viewId, reason: 'below_min_watch_seconds' });
      continue;
    }

    const key = buildMovieEpisodeKey(view.movieId, view.episodeId);
    const histories = historiesByKey.get(key) || [];
    const candidates = histories
      .map((history) => scoreCandidate(view, history, options))
      .filter(Boolean)
      .sort((a, b) => a.scoreMs - b.scoreMs);

    if (candidates.length === 0) {
      skipped.push({ viewHistoryId: viewId, reason: 'no_candidate' });
      continue;
    }

    if (
      candidates.length > 1 &&
      candidates[0].userId !== candidates[1].userId &&
      Math.abs(candidates[1].scoreMs - candidates[0].scoreMs) <= options.ambiguityMs
    ) {
      skipped.push({
        viewHistoryId: viewId,
        reason: 'ambiguous_candidate',
        topUserIds: [candidates[0].userId, candidates[1].userId],
      });
      continue;
    }

    perViewCandidates.set(viewId, candidates);
  }

  const edges = [];
  for (const candidates of perViewCandidates.values()) {
    edges.push(...candidates);
  }
  edges.sort((a, b) => a.scoreMs - b.scoreMs);

  const assignedViews = new Set();
  const historyUsage = new Map();
  const updates = [];

  for (const edge of edges) {
    if (assignedViews.has(edge.viewHistoryId)) {
      continue;
    }

    const currentUsage = historyUsage.get(edge.userHistoryId) || 0;
    if (currentUsage >= options.maxGuestViewsPerHistory) {
      continue;
    }

    assignedViews.add(edge.viewHistoryId);
    historyUsage.set(edge.userHistoryId, currentUsage + 1);
    updates.push({
      viewHistoryId: edge.viewHistoryId,
      userId: edge.userId,
      matchedUserHistoryId: edge.userHistoryId,
      scoreMs: edge.scoreMs,
      distanceToWindowMs: edge.distanceToWindowMs,
      distanceToEndMs: edge.distanceToEndMs,
      movieId: toIdString(edge.view.movieId),
      episodeId: toIdString(edge.view.episodeId),
      guestCreatedAt: edge.view.createdAt,
      guestWatchDuration: Number(edge.view.watchDuration) || 0,
      matchedAt: getHistoryEventTime(edge.history),
    });
  }

  for (const [viewId, candidates] of perViewCandidates.entries()) {
    if (assignedViews.has(viewId)) {
      continue;
    }

    skipped.push({
      viewHistoryId: viewId,
      reason: candidates.length > 0 ? 'candidate_conflict' : 'no_candidate',
    });
  }

  const reasonCounts = skipped.reduce((acc, item) => {
    acc[item.reason] = (acc[item.reason] || 0) + 1;
    return acc;
  }, {});

  return {
    options,
    updates,
    skipped,
    stats: {
      guestViews: guestViews.length,
      userHistories: userHistories.length,
      matched: updates.length,
      skipped: skipped.length,
      skippedByReason: reasonCounts,
    },
  };
};

const applyBackfillPlan = async (ViewHistoryModel, plan = {}) => {
  const updates = Array.isArray(plan.updates) ? plan.updates : [];
  if (updates.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const bulkOps = updates.map((item) => ({
    updateOne: {
      filter: { _id: item.viewHistoryId, userId: null },
      update: { $set: { userId: item.userId } },
    },
  }));

  const result = await ViewHistoryModel.bulkWrite(bulkOps, { ordered: false });
  return {
    matchedCount: result?.matchedCount || 0,
    modifiedCount: result?.modifiedCount || 0,
  };
};

module.exports = {
  DEFAULT_OPTIONS,
  applyBackfillPlan,
  buildBackfillPlan,
  buildMovieEpisodeKey,
  getHistoryEventTime,
  getSessionBounds,
  scoreCandidate,
  toIdString,
};
