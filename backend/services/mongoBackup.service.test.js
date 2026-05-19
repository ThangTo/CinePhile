const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBackupFileName,
  buildR2BackupKey,
  cleanupLocalBackups,
  normalizePrefix,
  resolveBackupOptions,
  sanitizeMongoOutput,
} = require('./mongoBackup.service');

test('buildBackupFileName uses Vietnam timezone and archive gzip suffix', () => {
  const fileName = buildBackupFileName({
    namePrefix: 'cinephine mongodb',
    date: new Date('2026-05-18T23:00:00.000Z'),
    timezone: 'Asia/Ho_Chi_Minh',
  });

  assert.equal(fileName, 'cinephine-mongodb-20260519-060000.archive.gz');
});

test('buildR2BackupKey normalizes prefix slashes', () => {
  assert.equal(
    buildR2BackupKey({ prefix: '/mongodb/daily/', fileName: 'backup.archive.gz' }),
    'mongodb/daily/backup.archive.gz',
  );
});

test('resolveBackupOptions falls back to MONGODB_URI and R2 bucket', () => {
  const options = resolveBackupOptions(
    {
      MONGODB_URI: 'mongodb://user:password@example.test/cinephine',
      R2_BUCKET_NAME: 'cinephine-assets',
    },
    {
      now: new Date('2026-05-18T23:00:00.000Z'),
    },
  );

  assert.equal(options.cronExpression, '0 6 * * *');
  assert.equal(options.fileName, 'cinephine-mongodb-20260519-060000.archive.gz');
  assert.equal(options.r2BucketName, 'cinephine-assets');
  assert.equal(options.r2Prefix, 'mongodb/daily');
  assert.equal(options.uri, 'mongodb://user:password@example.test/cinephine');
});

test('sanitizeMongoOutput redacts credentials in MongoDB URIs', () => {
  const output = sanitizeMongoOutput(
    'failed for mongodb+srv://backup_user:secret-pass@example.mongodb.net/cinephine',
  );

  assert.equal(
    output,
    'failed for mongodb+srv://<redacted>:<redacted>@example.mongodb.net/cinephine',
  );
});

test('normalizePrefix removes leading and trailing slashes', () => {
  assert.equal(normalizePrefix('/a/b/c/'), 'a/b/c');
});

test('cleanupLocalBackups removes only old archive files', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinephine-backup-test-'));

  try {
    const oldArchive = path.join(dir, 'old.archive.gz');
    const freshArchive = path.join(dir, 'fresh.archive.gz');
    const notes = path.join(dir, 'notes.txt');
    const now = new Date('2026-05-19T00:00:00.000Z').getTime();

    fs.writeFileSync(oldArchive, 'old');
    fs.writeFileSync(freshArchive, 'fresh');
    fs.writeFileSync(notes, 'notes');
    fs.utimesSync(oldArchive, new Date(now - 40 * 24 * 60 * 60 * 1000), new Date(now - 40 * 24 * 60 * 60 * 1000));
    fs.utimesSync(freshArchive, new Date(now), new Date(now));

    assert.equal(cleanupLocalBackups(dir, 30, now), 1);
    assert.equal(fs.existsSync(oldArchive), false);
    assert.equal(fs.existsSync(freshArchive), true);
    assert.equal(fs.existsSync(notes), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
