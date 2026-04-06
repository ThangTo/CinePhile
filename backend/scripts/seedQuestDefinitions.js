/**
 * Seed script: Tạo các định nghĩa nhiệm vụ mặc định.
 * Chạy: node scripts/seedQuestDefinitions.js
 *
 * Quy tắc coin:
 *   - rewardCoins: bội số của 10, tối thiểu 10, tối đa 500
 *   - completionBonusCoins: bội số của 10, tối thiểu 0, tối đa 500
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const QuestDefinition = require('../models/quest_definition.model');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
};

const DEFAULT_QUESTS = [
  // ─── Daily ───────────────────────────────────────────────────────────────
  {
    questId: 'daily_watch_10min',
    type: 'daily',
    category: 'watch',
    title: 'Xem phim 10 phút',
    description: 'Xem ít nhất 10 phút phim trong ngày',
    icon: 'fa-solid fa-play',
    targetValue: 600, // seconds
    targetMetric: 'watch_seconds',
    targetMovieFilter: 'any',
    rewardCoins: 10,
    completionBonusCoins: 50,
    isActive: true,
    order: 1,
  },
  {
    questId: 'daily_comment',
    type: 'daily',
    category: 'social',
    title: 'Bình luận 1 phim',
    description: 'Bình luận ít nhất 1 bộ phim bất kỳ',
    icon: 'fa-solid fa-comment',
    targetValue: 1,
    targetMetric: 'comment_count',
    targetMovieFilter: 'any',
    rewardCoins: 10,
    completionBonusCoins: 0, // bonus chỉ set ở quest đầu tiên
    isActive: true,
    order: 2,
  },
  {
    questId: 'daily_rate',
    type: 'daily',
    category: 'social',
    title: 'Đánh giá 1 phim',
    description: 'Đánh giá ít nhất 1 bộ phim bất kỳ',
    icon: 'fa-solid fa-star',
    targetValue: 1,
    targetMetric: 'rating_count',
    targetMovieFilter: 'any',
    rewardCoins: 10,
    completionBonusCoins: 0,
    isActive: true,
    order: 3,
  },
  {
    questId: 'daily_favorite',
    type: 'daily',
    category: 'engagement',
    title: 'Thêm phim vào yêu thích',
    description: 'Thêm ít nhất 1 bộ phim vào danh sách yêu thích',
    icon: 'fa-solid fa-heart',
    targetValue: 1,
    targetMetric: 'favorite_count',
    targetMovieFilter: 'any',
    rewardCoins: 10,
    completionBonusCoins: 0,
    isActive: true,
    order: 4,
  },
  {
    questId: 'daily_watchlist',
    type: 'daily',
    category: 'engagement',
    title: 'Thêm phim vào danh sách',
    description: 'Thêm ít nhất 1 bộ phim vào danh sách theo dõi',
    icon: 'fa-solid fa-bookmark',
    targetValue: 1,
    targetMetric: 'watchlist_count',
    targetMovieFilter: 'any',
    rewardCoins: 10,
    completionBonusCoins: 0,
    isActive: true,
    order: 5,
  },

  // ─── Weekly ──────────────────────────────────────────────────────────────
  {
    questId: 'weekly_watch_7movies',
    type: 'weekly',
    category: 'watch',
    title: 'Xem 7 phim khác nhau',
    description: 'Xem ít nhất 7 bộ phim khác nhau trong tuần',
    icon: 'fa-solid fa-film',
    targetValue: 7,
    targetMetric: 'unique_movies',
    targetMovieFilter: 'any',
    rewardCoins: 50,
    completionBonusCoins: 100,
    isActive: true,
    order: 1,
  },
  {
    questId: 'weekly_watch_60min',
    type: 'weekly',
    category: 'watch',
    title: 'Xem 60 phút phim',
    description: 'Xem tổng cộng 60 phút phim trong tuần',
    icon: 'fa-solid fa-clock',
    targetValue: 3600, // seconds
    targetMetric: 'watch_seconds',
    targetMovieFilter: 'any',
    rewardCoins: 50,
    completionBonusCoins: 0,
    isActive: true,
    order: 2,
  },
  {
    questId: 'weekly_comment_3',
    type: 'weekly',
    category: 'social',
    title: 'Bình luận 3 phim',
    description: 'Bình luận ít nhất 3 bộ phim trong tuần',
    icon: 'fa-solid fa-comments',
    targetValue: 3,
    targetMetric: 'comment_count',
    targetMovieFilter: 'any',
    rewardCoins: 30,
    completionBonusCoins: 0,
    isActive: true,
    order: 3,
  },
  {
    questId: 'weekly_rate_3',
    type: 'weekly',
    category: 'social',
    title: 'Đánh giá 3 phim',
    description: 'Đánh giá ít nhất 3 bộ phim trong tuần',
    icon: 'fa-solid fa-star-half-stroke',
    targetValue: 3,
    targetMetric: 'rating_count',
    targetMovieFilter: 'any',
    rewardCoins: 30,
    completionBonusCoins: 0,
    isActive: true,
    order: 4,
  },
];

const seed = async () => {
  await connectDB();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const questData of DEFAULT_QUESTS) {
    // Validate coin values
    const { rewardCoins, completionBonusCoins } = questData;
    if (rewardCoins % 10 !== 0 || rewardCoins < 10 || rewardCoins > 500) {
      console.warn(`[WARN] ${questData.questId}: rewardCoins=${rewardCoins} không hợp lệ (phải là bội số của 10, 10-500)`);
      skipped++;
      continue;
    }
    if (completionBonusCoins % 10 !== 0 || completionBonusCoins < 0 || completionBonusCoins > 500) {
      console.warn(`[WARN] ${questData.questId}: completionBonusCoins=${completionBonusCoins} không hợp lệ (phải là bội số của 10, 0-500)`);
      skipped++;
      continue;
    }

    const result = await QuestDefinition.findOneAndUpdate(
      { questId: questData.questId },
      { $set: questData },
      { upsert: true, new: true, runValidators: true }
    );

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      inserted++;
      console.log(`[INSERT] ${questData.questId} — ${questData.title}`);
    } else {
      updated++;
      console.log(`[UPDATE] ${questData.questId} — ${questData.title}`);
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
