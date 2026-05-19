const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const moment = require('moment-timezone');
const r2Service = require('./r2.service');

const DEFAULT_BACKUP_CRON = '0 6 * * *';
const DEFAULT_BACKUP_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_BACKUP_PREFIX = 'mongodb/daily';
const DEFAULT_BACKUP_RETENTION_DAYS = 30;
const DEFAULT_BACKUP_TIMEOUT_MS = 60 * 60 * 1000;
const DEFAULT_BACKUP_NAME_PREFIX = 'cinephine-mongodb';

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePrefix(prefix) {
  return String(prefix || DEFAULT_BACKUP_PREFIX)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function sanitizeFilePart(value) {
  return String(value || DEFAULT_BACKUP_NAME_PREFIX)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || DEFAULT_BACKUP_NAME_PREFIX;
}

function formatBackupTimestamp(date = new Date(), timezone = DEFAULT_BACKUP_TIMEZONE) {
  return moment(date).tz(timezone).format('YYYYMMDD-HHmmss');
}

function buildBackupFileName({ namePrefix = DEFAULT_BACKUP_NAME_PREFIX, date = new Date(), timezone = DEFAULT_BACKUP_TIMEZONE } = {}) {
  return `${sanitizeFilePart(namePrefix)}-${formatBackupTimestamp(date, timezone)}.archive.gz`;
}

function buildR2BackupKey({ prefix = DEFAULT_BACKUP_PREFIX, fileName }) {
  if (!fileName) {
    throw new Error('Backup filename is required');
  }

  return `${normalizePrefix(prefix)}/${fileName}`;
}

function getDefaultBackupDir(env = process.env) {
  if (env.MONGO_BACKUP_DIR) {
    return path.resolve(env.MONGO_BACKUP_DIR);
  }

  const baseDir = env.CINEPHINE_TEMP_DIR || env.TEMP_OUTPUT_DIR || path.join(__dirname, '..', 'temp_output');
  return path.resolve(baseDir, 'mongo_backups');
}

function resolveBackupOptions(env = process.env, overrides = {}) {
  const timezone = overrides.timezone || env.MONGO_BACKUP_TIMEZONE || DEFAULT_BACKUP_TIMEZONE;
  const now = overrides.now ? new Date(overrides.now) : new Date();
  const fileName = overrides.fileName || buildBackupFileName({
    namePrefix: overrides.namePrefix || env.MONGO_BACKUP_NAME_PREFIX || DEFAULT_BACKUP_NAME_PREFIX,
    date: now,
    timezone,
  });

  return {
    cronExpression: overrides.cronExpression || env.MONGO_BACKUP_CRON || DEFAULT_BACKUP_CRON,
    fileName,
    keepFailedLocal: parseBool(overrides.keepFailedLocal ?? env.MONGO_BACKUP_KEEP_FAILED_LOCAL, true),
    keepLocal: parseBool(overrides.keepLocal ?? env.MONGO_BACKUP_KEEP_LOCAL, false),
    localDir: path.resolve(overrides.localDir || getDefaultBackupDir(env)),
    mongodumpBin: overrides.mongodumpBin || env.MONGO_BACKUP_MONGODUMP_BIN || 'mongodump',
    now,
    r2BucketName: overrides.r2BucketName || env.MONGO_BACKUP_R2_BUCKET || env.R2_BUCKET_NAME,
    r2Prefix: normalizePrefix(overrides.r2Prefix || env.MONGO_BACKUP_R2_PREFIX || DEFAULT_BACKUP_PREFIX),
    retentionDays: parsePositiveInt(overrides.retentionDays ?? env.MONGO_BACKUP_RETENTION_DAYS, DEFAULT_BACKUP_RETENTION_DAYS),
    timeoutMs: parsePositiveInt(overrides.timeoutMs ?? env.MONGO_BACKUP_TIMEOUT_MS, DEFAULT_BACKUP_TIMEOUT_MS),
    timezone,
    trigger: overrides.trigger || 'manual',
    uri: overrides.uri || env.MONGO_BACKUP_URI || env.MONGODB_URI || env.MONGO_URI,
  };
}

function assertBackupConfig(options) {
  if (!options.uri) {
    throw new Error('MONGO_BACKUP_URI or MONGODB_URI is required for MongoDB backup');
  }

  if (!r2Service.hasR2Config({ bucketName: options.r2BucketName })) {
    throw new Error('R2 backup configuration is incomplete');
  }
}

function sanitizeMongoOutput(output) {
  return String(output || '')
    .replace(/(mongodb(?:\+srv)?:\/\/)([^:@/?\s]+):([^@/?\s]+)@/gi, '$1<redacted>:<redacted>@')
    .replace(/(uri:\s*).+/gi, '$1<redacted>');
}

function appendLimited(buffer, chunk, maxBytes = 12000) {
  const next = `${buffer}${chunk.toString()}`;
  if (next.length <= maxBytes) return next;
  return next.slice(next.length - maxBytes);
}

function writeMongoDumpConfig(uri) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinephine-mongodump-'));
  const configPath = path.join(dir, 'mongodump.yml');
  fs.writeFileSync(configPath, `uri: ${JSON.stringify(uri)}\n`, { mode: 0o600 });

  return {
    configPath,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

function runProcess(command, args, { timeoutMs }) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const child = spawn(command, args, {
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout = appendLimited(stdout, chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr = appendLimited(stderr, chunk);
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Failed to start ${command}: ${error.message}`));
    });

    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (timedOut) {
        reject(new Error(`${command} timed out after ${timeoutMs}ms`));
        return;
      }

      if (code !== 0) {
        const details = sanitizeMongoOutput(stderr || stdout);
        reject(new Error(`${command} exited with code ${code}${details ? `: ${details}` : ''}`));
        return;
      }

      resolve({
        code,
        signal,
        stdout: sanitizeMongoOutput(stdout),
        stderr: sanitizeMongoOutput(stderr),
      });
    });
  });
}

async function runMongoDump(options, localFilePath) {
  const dumpConfig = writeMongoDumpConfig(options.uri);

  try {
    await runProcess(
      options.mongodumpBin,
      [
        `--config=${dumpConfig.configPath}`,
        `--archive=${localFilePath}`,
        '--gzip',
        '--quiet',
      ],
      { timeoutMs: options.timeoutMs },
    );
  } finally {
    dumpConfig.cleanup();
  }
}

function cleanupLocalBackup(localFilePath) {
  if (localFilePath && fs.existsSync(localFilePath)) {
    fs.rmSync(localFilePath, { force: true });
  }
}

function cleanupLocalBackups(localDir, retentionDays, now = Date.now()) {
  const days = Number.parseInt(retentionDays, 10);
  if (!Number.isFinite(days) || days <= 0 || !fs.existsSync(localDir)) {
    return 0;
  }

  const cutoff = now - days * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const entry of fs.readdirSync(localDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.archive.gz')) {
      continue;
    }

    const filePath = path.join(localDir, entry.name);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs >= cutoff) {
      continue;
    }

    fs.rmSync(filePath, { force: true });
    deletedCount += 1;
  }

  return deletedCount;
}

async function cleanupRemoteBackups(options) {
  try {
    return await r2Service.deleteObjectsOlderThan(`${options.r2Prefix}/`, options.retentionDays, {
      bucketName: options.r2BucketName,
    });
  } catch (error) {
    console.warn(`[MongoBackup] Remote retention cleanup failed: ${error.message}`);
    return 0;
  }
}

async function runMongoBackup(overrides = {}) {
  const options = resolveBackupOptions(process.env, overrides);
  assertBackupConfig(options);

  fs.mkdirSync(options.localDir, { recursive: true });
  cleanupLocalBackups(options.localDir, options.retentionDays, options.now.getTime());

  const localFilePath = path.join(options.localDir, options.fileName);
  const r2Key = buildR2BackupKey({ prefix: options.r2Prefix, fileName: options.fileName });
  const startedAt = Date.now();
  let uploaded = false;

  console.log(`[MongoBackup] Starting ${options.trigger} backup: ${r2Key}`);

  try {
    await runMongoDump(options, localFilePath);

    const stat = fs.statSync(localFilePath);
    if (!stat.isFile() || stat.size <= 0) {
      throw new Error('mongodump completed but backup file is empty');
    }

    const uploadResult = await r2Service.uploadFileToR2(localFilePath, r2Key, {
      bucketName: options.r2BucketName,
      contentType: 'application/gzip',
      metadata: {
        source: 'cinephine-mongodb',
        trigger: options.trigger,
      },
    });

    if (!uploadResult) {
      throw new Error('R2 upload returned no result');
    }

    uploaded = true;
    const deletedRemoteBackups = await cleanupRemoteBackups(options);
    const durationMs = Date.now() - startedAt;

    console.log(
      `[MongoBackup] Completed: key=${uploadResult.key}, size=${stat.size} bytes, duration=${durationMs}ms, deleted_old=${deletedRemoteBackups}`,
    );

    return {
      bucket: uploadResult.bucket,
      durationMs,
      fileName: options.fileName,
      key: uploadResult.key,
      localFilePath: options.keepLocal ? localFilePath : null,
      sizeBytes: stat.size,
      deletedRemoteBackups,
    };
  } finally {
    if (!options.keepLocal && (uploaded || !options.keepFailedLocal)) {
      cleanupLocalBackup(localFilePath);
    }
  }
}

module.exports = {
  DEFAULT_BACKUP_CRON,
  DEFAULT_BACKUP_TIMEZONE,
  buildBackupFileName,
  buildR2BackupKey,
  cleanupLocalBackups,
  formatBackupTimestamp,
  normalizePrefix,
  resolveBackupOptions,
  runMongoBackup,
  sanitizeFilePart,
  sanitizeMongoOutput,
};
