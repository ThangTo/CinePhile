/**
 * PM2 Ecosystem Configuration
 * Quan ly processes voi PM2 thay vi Node.js cluster module
 */

module.exports = {
  apps: [
    {
      name: 'cinephine-api',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      env_file: '.env',
    },
    {
      name: 'cinephine-tiktok-worker',
      script: './tiktok_worker/app.py',
      interpreter: process.env.PYTHON_BIN || 'python3',
      instances: 1,
      exec_mode: 'fork',
      env: {
        TIKTOK_ENABLED: 'true',
        TIKTOK_WORKER_HOST: '127.0.0.1',
        TIKTOK_WORKER_PORT: 8787,
      },
      env_production: {
        TIKTOK_ENABLED: 'true',
        TIKTOK_WORKER_HOST: '127.0.0.1',
        TIKTOK_WORKER_PORT: 8787,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/tiktok-worker-error.log',
      out_file: './logs/tiktok-worker-out.log',
      log_file: './logs/tiktok-worker-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env_file: '.env',
    },
  ],
};

