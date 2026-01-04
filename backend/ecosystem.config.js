/**
 * PM2 Ecosystem Configuration
 * Quản lý processes với PM2 thay vì Node.js cluster module
 */

module.exports = {
  apps: [
    {
      name: 'cinephine-api',
      script: './server.js',
      instances: 'max', // Sử dụng tất cả CPU cores, hoặc set số cụ thể: 4
      exec_mode: 'cluster', // Cluster mode để load balancing
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Auto restart settings
      autorestart: true,
      watch: false, // Set true để auto restart khi code thay đổi (chỉ dùng trong dev)
      max_memory_restart: '1G', // Restart nếu memory vượt quá 1GB

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true, // Thêm timestamp vào logs
      merge_logs: true, // Merge logs từ tất cả instances
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Advanced settings
      min_uptime: '10s', // Minimum uptime để coi là stable
      max_restarts: 10, // Max restarts trong 1 phút
      restart_delay: 4000, // Delay trước khi restart (ms)

      // Graceful shutdown
      kill_timeout: 5000, // Timeout để graceful shutdown
      wait_ready: true, // Đợi app ready trước khi coi là online
      listen_timeout: 10000, // Timeout để app listen

      // Environment variables
      env_file: '.env', // Load từ .env file
    },
  ],
};
