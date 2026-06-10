const cron = require('node-cron');
const MovieModel = require('../models/movie.model');
const { updateEpisodesForMovies } = require('./admin.service');
const { runPageRange } = require('./crawler.service');
const { runPipeline: runTrendingPipeline } = require('./trending.service');
const analyticsService = require('./analytics.service');
const questService = require('./quest.service');
const premiumService = require('./premium.service');
const { runIntroDetectionBatch } = require('./introDetectionBatch.service');
const {
  DEFAULT_BACKUP_CRON,
  DEFAULT_BACKUP_TIMEZONE,
  runMongoBackup,
} = require('./mongoBackup.service');

function isEnvEnabled(name, defaultValue = true) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return defaultValue;
  }
  return !['0', 'false', 'no', 'off'].includes(String(rawValue).toLowerCase());
}

/**
 * Cron Service
 * Automated scheduled tasks for movie updates and crawling
 */

/**
 * Auto-update episodes for ongoing movies
 * Runs every Sunday at 2:00 AM
 */
const scheduleEpisodeUpdates = () => {
  // Cron expression: "0 20 * * *" = 20:00 (8 PM) hàng ngày
  cron.schedule(
    '0 20 * * *',
    async () => {
      console.log('🔄 [CRON] Starting automatic episode update for ongoing movies...');

      try {
        // Lấy tất cả phim đang cập nhật
        const ongoingMovies = await MovieModel.find({
          status: 'ongoing',
        })
          .select('_id')
          .lean();

        if (ongoingMovies.length === 0) {
          console.log('ℹ️  [CRON] No ongoing movies found to update');
          return;
        }

        const movieIds = ongoingMovies.map((m) => m._id.toString());
        console.log(`📊 [CRON] Found ${movieIds.length} ongoing movies to update`);

        // Progress callback để log
        const onProgress = (data) => {
          if (data.type === 'progress' && data.message) {
            console.log(`   ${data.message}`);
          }
        };

        // Cập nhật episodes (chỉ tập mới)
        const result = await updateEpisodesForMovies(movieIds, onProgress, true);

        console.log(
          `✅ [CRON] Episode update completed: ${result.updated} episodes updated for ${result.total} movies`,
        );
      } catch (error) {
        console.error('❌ [CRON] Error during automatic episode update:', error.message);
      }
    },
    {
      scheduled: true,
      timezone: 'Asia/Ho_Chi_Minh',
    },
  );

  console.log('✅ Scheduled: Auto-update episodes every Friday at 20:00 (Vietnam Time)');
};
/**
 * Auto-crawl new movies from API
 * Runs every 2 days at 3:00 AM (Vietnam Time)
 */
const scheduleMovieCrawling = () => {
  // Cron expression: "0 3 * * *" = 3:00 hàng ngày
  cron.schedule(
    '0 3 * * *',
    async () => {
      console.log('🔄 [CRON] Starting automatic movie crawling...');

      try {
        // Progress callback để log
        const onProgress = (data) => {
          if (data.type === 'progress' && data.message) {
            console.log(`   ${data.message}`);
          }
        };

        // Crawl trang 1 - 5 (phim mới nhất)
        const result = await runPageRange(5, 1, onProgress, true);

        console.log(
          `✅ [CRON] Movie crawling completed: ${result.created} new movies, ${result.updated} updated`,
        );
      } catch (error) {
        console.error('❌ [CRON] Error during automatic movie crawling:', error.message);
      }
    },
    {
      scheduled: true,
      timezone: 'Asia/Ho_Chi_Minh', // <--- Đã thêm cấu hình múi giờ VN
    },
  );

  console.log('✅ Scheduled: Auto-crawl new movies every 2 days at 3:00 AM (Vietnam Time)');
};

/**
 * Auto-update AI Trending Movies (TMDB + Google Trends + LLM)
 * Runs every 12 hours at 00:00 and 12:00
 */
const scheduleTrendingUpdate = () => {
  cron.schedule(
    '0 0,12 * * *',
    async () => {
      console.log('\n🔄 [CRON] Starting AI Trending Pipeline...');
      try {
        await runTrendingPipeline();
        console.log('✅ [CRON] AI Trending Pipeline completed successfully.');
      } catch (error) {
        console.error('❌ [CRON] AI Trending Pipeline failed:', error.message);
      }
    },
    {
      scheduled: true,
      timezone: 'Asia/Ho_Chi_Minh',
    },
  );
  console.log('✅ Scheduled: AI Trending Update every 12 hours (00:00 & 12:00 Vietnam Time)');
};

/**
 * Snapshot today's analytics into MongoDB every night at 23:55 VN time
 * Also runs a one-time backfill of recent Redis data on startup.
 */
const scheduleDailyAnalyticsSnapshot = () => {
  cron.schedule(
    '55 23 * * *',
    async () => {
      const moment = require('moment-timezone');
      const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
      console.log(`\n📊 [CRON] Snapshotting analytics for ${today} into MongoDB...`);
      try {
        const doc = await analyticsService.snapshotDailyVisits(today);
        console.log(`✅ [CRON] Daily snapshot: ${today} — total=${doc.total}, users=${doc.userCount}, guests=${doc.guestCount}`);

        // Also snapshot true-unique counts for current week and month
        const [weekDoc, monthDoc] = await Promise.all([
          analyticsService.snapshotPeriodUnique('week'),
          analyticsService.snapshotPeriodUnique('month'),
        ]);
        console.log(`✅ [CRON] Period unique snapshot — week=${weekDoc.total} unique, month=${monthDoc.total} unique`);
      } catch (error) {
        console.error('❌ [CRON] Analytics snapshot failed:', error.message);
      }
    },
    {
      scheduled: true,
      timezone: 'Asia/Ho_Chi_Minh',
    }
  );

  console.log('✅ Scheduled: Daily analytics snapshot at 23:55 (Vietnam Time)');
};

/**
 * Backfill recent analytics data from Redis into MongoDB on startup.
 * Runs asynchronously without blocking server boot.
 */
const scheduleQuestAutoClaim = () => {
  cron.schedule(
    '5 0 * * *',
    async () => {
      console.log('\nðŸª™ [CRON] Auto-claiming expired quest rewards...');
      try {
        const results = await questService.autoClaimExpiredQuestPeriods({ now: new Date() });
        const summary = results
          .map(
            (result) =>
              `${result.type}:${result.periodKey} users=${result.processedUsers} coins=${result.totalCoinsAwarded}`,
          )
          .join(' | ');
        console.log(`âœ… [CRON] Quest auto-claim completed: ${summary || 'no rewards processed'}`);
      } catch (error) {
        console.error('âŒ [CRON] Quest auto-claim failed:', error.message);
      }
    },
    {
      scheduled: true,
      timezone: 'Asia/Ho_Chi_Minh',
    },
  );

  console.log('âœ… Scheduled: Quest auto-claim every day at 00:05 (Vietnam Time)');
};

const runPremiumExpiryCleanup = async ({ trigger = 'manual', now = new Date() } = {}) => {
  try {
    const result = await premiumService.expirePremiumUsers(now);
    if (result.matched > 0) {
      console.log(
        `[PremiumExpiry] ${trigger}: expired=${result.modified}/${result.matched}, cursorReset=${result.cursorReset}`,
      );
    }
    return result;
  } catch (error) {
    console.error(`[PremiumExpiry] ${trigger} failed: ${error.message}`);
    throw error;
  }
};

const schedulePremiumExpiryCleanup = () => {
  const cronExpression = process.env.PREMIUM_EXPIRY_CRON || '0 7 * * *';
  const timezone = process.env.PREMIUM_EXPIRY_TIMEZONE || 'Asia/Ho_Chi_Minh';

  cron.schedule(
    cronExpression,
    async () => {
      await runPremiumExpiryCleanup({ trigger: 'cron' }).catch(() => {});
    },
    {
      scheduled: true,
      timezone,
    },
  );

  console.log(`[PremiumExpiry] Scheduled: "${cronExpression}" (${timezone})`);
};

const scheduleIntroDetectionBatch = () => {
  const cronExpression = process.env.INTRO_BATCH_CRON || '0 4 * * *';
  const timezone = process.env.INTRO_BATCH_TIMEZONE || 'Asia/Ho_Chi_Minh';

  cron.schedule(
    cronExpression,
    async () => {
      console.log('\n[IntroBatch] Nightly intro detection cron started...');
      try {
        const summary = await runIntroDetectionBatch({ trigger: 'cron' });
        if (summary.state === 'skipped') {
          console.log(`[IntroBatch] Cron skipped: ${summary.reason}`);
          return;
        }

        console.log(
          `[IntroBatch] Cron finished: state=${summary.state}, processed=${summary.processedMovies}/${summary.totalMovies}, detected=${summary.detectedMovies}, no_match=${summary.noMatchMovies}, failed=${summary.failedMovies}`,
        );
      } catch (error) {
        console.error(`[IntroBatch] Cron failed: ${error.message}`);
      }
    },
    {
      scheduled: true,
      timezone,
    },
  );

  console.log(`[IntroBatch] Scheduled: nightly intro detection at "${cronExpression}" (${timezone})`);
};

const scheduleMongoBackup = () => {
  const cronExpression = process.env.MONGO_BACKUP_CRON || DEFAULT_BACKUP_CRON;
  const timezone = process.env.MONGO_BACKUP_TIMEZONE || DEFAULT_BACKUP_TIMEZONE;

  cron.schedule(
    cronExpression,
    async () => {
      console.log('\n[MongoBackup] Daily MongoDB backup cron started...');
      try {
        await runMongoBackup({ trigger: 'cron' });
      } catch (error) {
        console.error(`[MongoBackup] Backup failed: ${error.message}`);
      }
    },
    {
      scheduled: true,
      timezone,
    },
  );

  console.log(`[MongoBackup] Scheduled: MongoDB backup at "${cronExpression}" (${timezone})`);
};

const runAnalyticsBackfill = () => {
  // Defer slightly to ensure DB connection is ready
  setTimeout(async () => {
    console.log('\n💬 [Analytics] Running historical backfill from Redis...');
    try {
      const [daily, period] = await Promise.all([
        analyticsService.backfillHistoricalData(),
        analyticsService.backfillPeriodData(),
      ]);
      console.log(`✅ [Analytics] Daily backfill: ${daily.processed} written, ${daily.skipped} skipped`);
      console.log(`✅ [Analytics] Period backfill: ${period.processed} written, ${period.skipped} skipped`);
    } catch (err) {
      console.error('❌ [Analytics] Backfill failed:', err.message);
    }
  }, 5000);
};

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
  if (!isEnvEnabled('CRON_ENABLED', true)) {
    console.log('\nCron jobs disabled by CRON_ENABLED=false\n');
    return;
  }

  console.log('\n🕐 Initializing cron jobs...');

  if (isEnvEnabled('CRON_EPISODE_UPDATES_ENABLED', true)) scheduleEpisodeUpdates();
  if (isEnvEnabled('CRON_MOVIE_CRAWLING_ENABLED', true)) scheduleMovieCrawling();
  if (isEnvEnabled('CRON_TRENDING_UPDATE_ENABLED', true)) scheduleTrendingUpdate();
  if (isEnvEnabled('CRON_ANALYTICS_SNAPSHOT_ENABLED', true)) scheduleDailyAnalyticsSnapshot();
  if (isEnvEnabled('CRON_QUEST_AUTO_CLAIM_ENABLED', true)) scheduleQuestAutoClaim();
  if (isEnvEnabled('CRON_PREMIUM_EXPIRY_ENABLED', true)) schedulePremiumExpiryCleanup();
  if (isEnvEnabled('CRON_MONGO_BACKUP_ENABLED', true)) scheduleMongoBackup();
  if (
    isEnvEnabled('INTRO_BATCH_ENABLED', true) &&
    isEnvEnabled('CRON_INTRO_BATCH_ENABLED', true)
  ) {
    scheduleIntroDetectionBatch();
  }

  // Run one-time backfill to seed MongoDB from existing Redis data
  if (isEnvEnabled('CRON_ANALYTICS_BACKFILL_ENABLED', true)) runAnalyticsBackfill();

  console.log('✅ All cron jobs initialized successfully\n');
};

module.exports = {
  initCronJobs,
  scheduleEpisodeUpdates,
  scheduleMovieCrawling,
  scheduleTrendingUpdate,
  scheduleDailyAnalyticsSnapshot,
  scheduleQuestAutoClaim,
  schedulePremiumExpiryCleanup,
  scheduleIntroDetectionBatch,
  scheduleMongoBackup,
  runPremiumExpiryCleanup,
  runAnalyticsBackfill,
};
