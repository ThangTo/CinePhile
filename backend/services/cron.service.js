const cron = require('node-cron');
const MovieModel = require('../models/movie.model');
const { updateEpisodesForMovies } = require('./admin.service');
const { runPageRange } = require('./crawler.service');
const { runPipeline: runTrendingPipeline } = require('./trending.service');
const analyticsService = require('./analytics.service');

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
        console.log(`✅ [CRON] Analytics snapshot saved: ${today} — total=${doc.total}, users=${doc.userCount}, guests=${doc.guestCount}`);
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
const runAnalyticsBackfill = () => {
  // Defer slightly to ensure DB connection is ready
  setTimeout(async () => {
    console.log('\n💬 [Analytics] Running historical backfill from Redis...');
    try {
      const result = await analyticsService.backfillHistoricalData();
      console.log(`✅ [Analytics] Backfill complete: ${result.processed} days written, ${result.skipped} days skipped (already in DB)`);
    } catch (err) {
      console.error('❌ [Analytics] Backfill failed:', err.message);
    }
  }, 5000); // 5 second delay
};

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
  console.log('\n🕐 Initializing cron jobs...');

  scheduleEpisodeUpdates();
  scheduleMovieCrawling();
  scheduleTrendingUpdate();
  scheduleDailyAnalyticsSnapshot();

  // Run one-time backfill to seed MongoDB from existing Redis data
  runAnalyticsBackfill();

  console.log('✅ All cron jobs initialized successfully\n');
};

module.exports = {
  initCronJobs,
  scheduleEpisodeUpdates,
  scheduleMovieCrawling,
  scheduleTrendingUpdate,
  scheduleDailyAnalyticsSnapshot,
  runAnalyticsBackfill,
};
