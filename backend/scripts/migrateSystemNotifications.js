/**
 * Migration Script: Convert old system notifications (userId: null) to per-user notifications
 * 
 * Script này sẽ:
 * 1. Tìm tất cả thông báo system cũ (userId: null)
 * 2. Lấy danh sách tất cả users
 * 3. Tạo một bản copy của mỗi thông báo system cho mỗi user
 * 4. Xóa các thông báo system cũ (userId: null)
 * 
 * Chạy script: node backend/scripts/migrateSystemNotifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { connectDB } = require('../config/db/db');

const migrateSystemNotifications = async () => {
  try {
    console.log('🔄 Bắt đầu migration system notifications...');
    
    // Kết nối database
    await connectDB();
    
    // 1. Tìm tất cả thông báo system cũ (userId: null)
    const systemNotifications = await Notification.find({ userId: null }).lean();
    console.log(`📋 Tìm thấy ${systemNotifications.length} thông báo system cũ`);
    
    if (systemNotifications.length === 0) {
      console.log('✅ Không có thông báo system cũ cần migration');
      process.exit(0);
    }
    
    // 2. Lấy danh sách tất cả users
    const users = await User.find({}).select('_id').lean();
    console.log(`👥 Tìm thấy ${users.length} users trong hệ thống`);
    
    if (users.length === 0) {
      console.log('⚠️  Không có users nào trong hệ thống, bỏ qua migration');
      process.exit(0);
    }
    
    // 3. Tạo thông báo mới cho từng user
    let totalCreated = 0;
    
    for (const systemNoti of systemNotifications) {
      const notificationsToCreate = users.map((user) => ({
        title: systemNoti.title,
        message: systemNoti.message,
        type: systemNoti.type,
        movieId: systemNoti.movieId || null,
        userId: user._id,
        targetUrl: systemNoti.targetUrl || null,
        isRead: systemNoti.isRead || false,
        createdAt: systemNoti.createdAt || new Date(),
        updatedAt: systemNoti.updatedAt || new Date(),
      }));
      
      // Insert bulk
      const result = await Notification.insertMany(notificationsToCreate);
      totalCreated += result.length;
      console.log(`✅ Đã tạo ${result.length} bản copy cho thông báo: "${systemNoti.title}"`);
    }
    
    // 4. Xóa các thông báo system cũ
    const deleteResult = await Notification.deleteMany({ userId: null });
    console.log(`🗑️  Đã xóa ${deleteResult.deletedCount} thông báo system cũ`);
    
    console.log('\n✅ Migration hoàn tất!');
    console.log(`📊 Tổng kết:`);
    console.log(`   - Thông báo system cũ: ${systemNotifications.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Thông báo mới được tạo: ${totalCreated}`);
    console.log(`   - Thông báo cũ đã xóa: ${deleteResult.deletedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    process.exit(1);
  }
};

// Chạy migration
migrateSystemNotifications();

