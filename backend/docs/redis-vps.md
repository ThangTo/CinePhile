# Redis on VPS for CinePhine

Use local Redis for Bull queues and cache on the production VPS. This avoids
Upstash request quotas for intro detection batch jobs.

## Production env

Set these values in `backend/.env.production` on the VPS:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
REDIS_URL=redis://127.0.0.1:6379

SCHEDULER_PM2_ENABLED=true
QUEUE_WORKERS_PM2_ENABLED=true
CRON_INTRO_BATCH_ENABLED=true
INTRO_DETECTION_REQUIRE_REDIS=true
INTRO_DETECTION_CONCURRENCY=1
INTRO_BATCH_ENABLED=true
INTRO_BATCH_SAMPLE_SECONDS=600
```

The current Node entrypoints and PM2 ecosystem load `.env` by default. After
editing `.env.production`, sync it to `.env` before restarting PM2:

```bash
cp backend/.env.production backend/.env
```

Keep Redis bound to localhost. Do not expose port `6379` to the public internet.

## Ubuntu/Debian setup

From the `backend` directory on the VPS:

```bash
sudo bash scripts/setupRedisVps.sh
redis-cli -h 127.0.0.1 ping
```

Expected output:

```text
PONG
```

## Restart app processes

After updating env and Redis:

```bash
pm2 restart cinephine-api
pm2 restart cinephine-intro-worker
pm2 restart cinephine-scheduler
```

If the processes do not exist yet:

```bash
pm2 start ecosystem.config.js --env production --only cinephine-api,cinephine-intro-worker,cinephine-scheduler
pm2 save
```

## Health checks

```bash
redis-cli -h 127.0.0.1 info memory | grep used_memory_human
pm2 logs cinephine-intro-worker --lines 80
pm2 logs cinephine-scheduler --lines 80
```

The intro worker should start without Upstash quota errors.
