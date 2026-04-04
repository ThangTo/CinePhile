/**
 * Seed script: Áp dụng hiệu ứng glitter cho tất cả premium user hiện tại.
 * Chạy: node scripts/seedPremiumCursorEffects.js
 *
 * Logic:
 *  - Premium user chưa có cursorEffectId hoặc đang là null/undefined → set 'glitter'
 *  - Premium user đang là 'none' → giữ nguyên (họ tự tắt)
 *  - Non-premium user → không thay đổi
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/user.model');
const { isPremiumActive } = require('../utils/premiumUtils');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
};

const seed = async () => {
  await connectDB();

  // Seed cursor effects trước
  try {
    const cursorEffectService = require('../services/cursorEffect.service');
    await cursorEffectService.seedEffects();
    console.log('Cursor effects seeded');
  } catch (err) {
    console.warn('CursorEffect seed skipped:', err.message);
  }

  // Tìm tất cả premium user chưa có cursorEffectId
  const users = await User.find({}).lean();

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    if (!isPremiumActive(user)) {
      skipped++;
      continue;
    }

    const currentEffect = user.cursorEffectId;

    // Đã có effect hợp lệ (không phải none/null/undefined) → giữ nguyên
    if (currentEffect && currentEffect !== 'none') {
      console.log(`  [SKIP] ${user.email} — đã có effect: ${currentEffect}`);
      skipped++;
      continue;
    }

    // Chưa có hoặc đang là 'none' → set glitter
    await User.updateOne(
      { _id: user._id },
      { $set: { cursorEffectId: 'glitter' } }
    );
    updated++;
    console.log(`  [UPDATED] ${user.email} → glitter`);
  }

  console.log(`\n✅ Hoàn tất. Đã cập nhật: ${updated} | Bỏ qua: ${skipped}`);
  await mongoose.connection.close();
  process.exit(0);
};

seed().catch(async (err) => {
  console.error('❌ Lỗi:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});
