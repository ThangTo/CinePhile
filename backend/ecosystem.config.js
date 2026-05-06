/**
 * PM2 Ecosystem Configuration
 * Quan ly processes voi PM2 thay vi Node.js cluster module.
 */

try {
  require('dotenv').config();
} catch (_error) {
  // PM2 can still start with process environment variables if dotenv is unavailable.
}

const apiInstances = Math.max(
  1,
  Number.parseInt(process.env.WEB_CONCURRENCY || process.env.PM2_INSTANCES || '1', 10) || 1,
);
const apiMaxMemory = process.env.API_MAX_MEMORY_RESTART || '450M';
const apiNodeArgs = process.env.API_NODE_ARGS || '--max-old-space-size=384';
const enableTikTokWorker = String(process.env.TIKTOK_WORKER_PM2_ENABLED || '').toLowerCase() === 'true';

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

const enableScheduler = parseBool(process.env.SCHEDULER_PM2_ENABLED, true);
const enableQueueWorkers = Boolean(process.env.REDIS_URL) && parseBool(process.env.QUEUE_WORKERS_PM2_ENABLED, true);
const workerNodeArgs = process.env.WORKER_NODE_ARGS || '--max-old-space-size=512';

const apps = [
  {
    name: 'cinephine-api',
    script: './server.js',
    instances: apiInstances,
    exec_mode: 'cluster',
    node_args: apiNodeArgs,
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
      API_CRON_ENABLED: process.env.API_CRON_ENABLED || 'false',
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      API_CRON_ENABLED: process.env.API_CRON_ENABLED || 'false',
    },
    autorestart: true,
    watch: false,
    max_memory_restart: apiMaxMemory,
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
];

if (enableScheduler) {
  apps.push({
    name: 'cinephine-scheduler',
    script: './scheduler.js',
    instances: 1,
    exec_mode: 'fork',
    node_args: workerNodeArgs,
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    },
    autorestart: true,
    watch: false,
    max_memory_restart: process.env.SCHEDULER_MAX_MEMORY_RESTART || '400M',
    error_file: './logs/scheduler-error.log',
    out_file: './logs/scheduler-out.log',
    log_file: './logs/scheduler-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    env_file: '.env',
  });
}

if (enableQueueWorkers) {
  apps.push(
    {
      name: 'cinephine-analysis-worker',
      script: './workers/analysisWorker.js',
      instances: Number.parseInt(process.env.ANALYSIS_WORKER_INSTANCES || '1', 10) || 1,
      exec_mode: 'fork',
      node_args: workerNodeArgs,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: process.env.ANALYSIS_WORKER_MAX_MEMORY_RESTART || '700M',
      error_file: './logs/analysis-worker-error.log',
      out_file: './logs/analysis-worker-out.log',
      log_file: './logs/analysis-worker-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env_file: '.env',
    },
    {
      name: 'cinephine-render-worker',
      script: './workers/renderWorker.js',
      instances: Number.parseInt(process.env.RENDER_WORKER_INSTANCES || '1', 10) || 1,
      exec_mode: 'fork',
      node_args: workerNodeArgs,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: process.env.RENDER_WORKER_MAX_MEMORY_RESTART || '900M',
      error_file: './logs/render-worker-error.log',
      out_file: './logs/render-worker-out.log',
      log_file: './logs/render-worker-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env_file: '.env',
    },
    {
      name: 'cinephine-intro-worker',
      script: './workers/introDetectionWorker.js',
      instances: Number.parseInt(process.env.INTRO_WORKER_INSTANCES || '1', 10) || 1,
      exec_mode: 'fork',
      node_args: workerNodeArgs,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: process.env.INTRO_WORKER_MAX_MEMORY_RESTART || '700M',
      error_file: './logs/intro-worker-error.log',
      out_file: './logs/intro-worker-out.log',
      log_file: './logs/intro-worker-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env_file: '.env',
    },
    {
      name: 'cinephine-subtitle-worker',
      script: './workers/subtitleWorker.js',
      instances: Number.parseInt(process.env.SUBTITLE_WORKER_INSTANCES || '1', 10) || 1,
      exec_mode: 'fork',
      node_args: workerNodeArgs,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: process.env.SUBTITLE_WORKER_MAX_MEMORY_RESTART || '700M',
      error_file: './logs/subtitle-worker-error.log',
      out_file: './logs/subtitle-worker-out.log',
      log_file: './logs/subtitle-worker-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env_file: '.env',
    },
  );
}

if (enableTikTokWorker) {
  apps.push({
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
    max_memory_restart: process.env.TIKTOK_WORKER_MAX_MEMORY_RESTART || '256M',
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
  });
}

module.exports = { apps };
