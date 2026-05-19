const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { runMongoBackup } = require('../services/mongoBackup.service');

runMongoBackup({ trigger: 'manual' })
  .then((result) => {
    console.log('[MongoBackup] Manual backup finished:');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(`[MongoBackup] Manual backup failed: ${error.message}`);
    process.exit(1);
  });
