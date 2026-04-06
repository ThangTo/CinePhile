require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');

const { connectDB } = require('../config/db/db');
const ViewHistory = require('../models/view_history.model');
const UserHistory = require('../models/user_history.model');
const {
  DEFAULT_OPTIONS,
  applyBackfillPlan,
  buildBackfillPlan,
} = require('../services/viewHistoryBackfill.service');

const parseArgs = (argv = []) => {
  const args = {
    write: false,
    limit: null,
    since: null,
    minGuestWatchSeconds: DEFAULT_OPTIONS.minGuestWatchSeconds,
    maxLeadMinutes: DEFAULT_OPTIONS.maxLeadMinutes,
    maxLagMinutes: DEFAULT_OPTIONS.maxLagMinutes,
    ambiguityMs: DEFAULT_OPTIONS.ambiguityMs,
    maxScoreMs: DEFAULT_OPTIONS.maxScoreMs,
    sample: 20,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--write' || arg === '--apply') {
      args.write = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    if (arg.startsWith('--since=')) {
      args.since = arg.slice('--since='.length);
      continue;
    }
    if (arg.startsWith('--limit=')) {
      args.limit = Number(arg.slice('--limit='.length)) || null;
      continue;
    }
    if (arg.startsWith('--sample=')) {
      args.sample = Math.max(1, Number(arg.slice('--sample='.length)) || 20);
      continue;
    }
    if (arg.startsWith('--min-guest-watch-seconds=')) {
      args.minGuestWatchSeconds = Math.max(0, Number(arg.slice('--min-guest-watch-seconds='.length)) || 0);
      continue;
    }
    if (arg.startsWith('--max-lead-minutes=')) {
      args.maxLeadMinutes = Math.max(0, Number(arg.slice('--max-lead-minutes='.length)) || DEFAULT_OPTIONS.maxLeadMinutes);
      continue;
    }
    if (arg.startsWith('--max-lag-minutes=')) {
      args.maxLagMinutes = Math.max(0, Number(arg.slice('--max-lag-minutes='.length)) || DEFAULT_OPTIONS.maxLagMinutes);
      continue;
    }
    if (arg.startsWith('--ambiguity-ms=')) {
      args.ambiguityMs = Math.max(0, Number(arg.slice('--ambiguity-ms='.length)) || DEFAULT_OPTIONS.ambiguityMs);
      continue;
    }
    if (arg.startsWith('--max-score-ms=')) {
      args.maxScoreMs = Math.max(0, Number(arg.slice('--max-score-ms='.length)) || DEFAULT_OPTIONS.maxScoreMs);
    }
  }

  return args;
};

const printUsage = () => {
  console.log('Backfill ViewHistory.userId from UserHistory heuristics');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/backfillViewHistoryUsers.js [--since=YYYY-MM-DD] [--limit=5000] [--sample=20]');
  console.log('  node scripts/backfillViewHistoryUsers.js --write [--since=YYYY-MM-DD]');
  console.log('');
  console.log('Flags:');
  console.log('  --write                   Apply updates. Default is dry-run.');
  console.log('  --since=YYYY-MM-DD        Only inspect guest views created on or after this date.');
  console.log('  --limit=NUMBER            Limit guest views scanned (newest first).');
  console.log('  --sample=NUMBER           Print this many planned updates/skips.');
  console.log(`  --min-guest-watch-seconds Number of watched seconds required. Default: ${DEFAULT_OPTIONS.minGuestWatchSeconds}`);
  console.log(`  --max-lead-minutes        Match progress that happens slightly before session start. Default: ${DEFAULT_OPTIONS.maxLeadMinutes}`);
  console.log(`  --max-lag-minutes         Match progress that happens after session end. Default: ${DEFAULT_OPTIONS.maxLagMinutes}`);
  console.log(`  --ambiguity-ms            Skip if top 2 users are too close. Default: ${DEFAULT_OPTIONS.ambiguityMs}`);
  console.log(`  --max-score-ms            Maximum score allowed for an auto-match. Default: ${DEFAULT_OPTIONS.maxScoreMs}`);
};

const buildViewQuery = (args) => {
  const query = { userId: null };
  if (args.since) {
    const sinceDate = new Date(args.since);
    if (Number.isNaN(sinceDate.getTime())) {
      throw new Error(`Invalid --since value: ${args.since}`);
    }
    query.createdAt = { $gte: sinceDate };
  }
  return query;
};

const formatDate = (value) => {
  if (!value) return 'n/a';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toISOString();
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  console.log(`Mode: ${args.write ? 'WRITE' : 'DRY-RUN'}`);
  console.log(`Mongo configured: ${Boolean(process.env.MONGODB_URI)}`);

  const connection = await connectDB();
  if (!connection) {
    throw new Error('Database connection was not established');
  }

  const viewQuery = buildViewQuery(args);
  const guestViewsQuery = ViewHistory.find(viewQuery)
    .sort({ createdAt: -1 })
    .select('_id movieId episodeId userId ipAddress userAgent watchDuration createdAt');

  if (args.limit) {
    guestViewsQuery.limit(args.limit);
  }

  const guestViews = await guestViewsQuery.lean();
  const movieIds = [...new Set(guestViews.map((item) => item.movieId?.toString()).filter(Boolean))]
    .map((id) => new mongoose.Types.ObjectId(id));

  const userHistoryQuery = movieIds.length > 0
    ? { movieId: { $in: movieIds } }
    : { _id: null };

  if (viewQuery.createdAt?.$gte) {
    userHistoryQuery.lastWatchedAt = {
      $gte: new Date(viewQuery.createdAt.$gte.getTime() - args.maxLeadMinutes * 60 * 1000),
    };
  }

  const userHistories = movieIds.length > 0
    ? await UserHistory.find(userHistoryQuery)
      .select('_id userId movieId episodeId watchTime lastWatchedAt createdAt updatedAt')
      .lean()
    : [];

  const plan = buildBackfillPlan(guestViews, userHistories, {
    minGuestWatchSeconds: args.minGuestWatchSeconds,
    maxLeadMinutes: args.maxLeadMinutes,
    maxLagMinutes: args.maxLagMinutes,
    ambiguityMs: args.ambiguityMs,
    maxScoreMs: args.maxScoreMs,
  });

  console.log('');
  console.log('Summary');
  console.log(`- Guest views scanned: ${plan.stats.guestViews}`);
  console.log(`- User histories scanned: ${plan.stats.userHistories}`);
  console.log(`- Matches planned: ${plan.stats.matched}`);
  console.log(`- Skipped: ${plan.stats.skipped}`);

  if (Object.keys(plan.stats.skippedByReason).length > 0) {
    console.log('- Skip reasons:');
    Object.entries(plan.stats.skippedByReason)
      .sort((a, b) => b[1] - a[1])
      .forEach(([reason, count]) => {
        console.log(`  ${reason}: ${count}`);
      });
  }

  if (plan.updates.length > 0) {
    console.log('');
    console.log(`Sample planned updates (${Math.min(args.sample, plan.updates.length)}):`);
    plan.updates.slice(0, args.sample).forEach((item, index) => {
      console.log(
        `${index + 1}. view=${item.viewHistoryId} user=${item.userId} movie=${item.movieId} episode=${item.episodeId || 'null'} scoreMs=${item.scoreMs} created=${formatDate(item.guestCreatedAt)} matchedAt=${formatDate(item.matchedAt)}`,
      );
    });
  }

  if (plan.skipped.length > 0) {
    console.log('');
    console.log(`Sample skipped rows (${Math.min(args.sample, plan.skipped.length)}):`);
    plan.skipped.slice(0, args.sample).forEach((item, index) => {
      console.log(`${index + 1}. view=${item.viewHistoryId} reason=${item.reason}`);
    });
  }

  if (!args.write) {
    console.log('');
    console.log('Dry-run complete. Re-run with --write to apply these updates.');
    return;
  }

  console.log('');
  console.log('Applying updates...');
  const result = await applyBackfillPlan(ViewHistory, plan);
  console.log(`- Matched by bulkWrite: ${result.matchedCount}`);
  console.log(`- Modified: ${result.modifiedCount}`);
};

main()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Backfill failed:', error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
