const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB } = require('../config/db/db');
const User = require('../models/user.model');
const avatarService = require('../services/avatar.service');

async function main() {
  if (!avatarService.hasR2Config) {
    throw new Error(
      'Avatar storage is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY and R2_BUCKET_NAME.',
    );
  }

  await connectDB();

  const users = await User.find({}).select('_id username email avatar avatarStorageKey');

  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const user of users) {
    const previousAvatar = user.avatar;
    const previousStorageKey = user.avatarStorageKey;

    try {
      await avatarService.migrateStoredAvatarToR2(user);

      if (user.avatar !== previousAvatar || user.avatarStorageKey !== previousStorageKey) {
        migratedCount += 1;
        console.log(`[Avatar Migration] Updated ${user._id} (${user.username || user.email})`);
      } else {
        skippedCount += 1;
      }
    } catch (error) {
      failedCount += 1;
      console.error(
        `[Avatar Migration] Failed for ${user._id} (${user.username || user.email}): ${error.message}`,
      );
    }
  }

  console.log('[Avatar Migration] Done');
  console.log(
    JSON.stringify(
      {
        total: users.length,
        migrated: migratedCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('[Avatar Migration] Fatal error:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await User.db.close();
    } catch (_error) {
      // Ignore shutdown errors.
    }
  });
