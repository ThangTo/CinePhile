const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 30, // Tăng từ default 10 lên 50 connections
      minPoolSize: 10, // Giữ tối thiểu 10 connections
      serverSelectionTimeoutMS: 5000, // Timeout sau 5 giây
      socketTimeoutMS: 45000, // Socket timeout 45 giây
      family: 4, // Sử dụng IPv4
      // bufferMaxEntries và bufferCommands đã bị deprecated trong Mongoose 6+
      // Mongoose tự động xử lý buffering
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB connected');
    console.log(`📊 Connection pool: min=${options.minPoolSize}, max=${options.maxPoolSize}`);
  } catch (err) {
    console.error('❌ DB connection failed:', err);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

module.exports = {
  connectDB,
};
