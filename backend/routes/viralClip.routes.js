const express = require('express');
const router = express.Router();
const viralClipController = require('../controllers/viralClip.controller');

const multer = require('multer');
const os = require('os');
const upload = multer({ dest: os.tmpdir() });

// POST /api/v1/generate-viral-clips
// Start the viral clip generation pipeline
router.post('/generate-viral-clips', upload.single('bgmFile'), viralClipController.generateViralClips);

// GET /api/v1/viral-clips/analysis-job/:jobId
// Check the status of the analysis pipeline
router.get('/viral-clips/analysis-job/:jobId', viralClipController.getAnalysisJobStatus);

// GET /api/v1/viral-clips/job/:jobId
// Check the status of a specific rendering job
router.get('/viral-clips/job/:jobId', viralClipController.getJobStatus);

module.exports = router;
