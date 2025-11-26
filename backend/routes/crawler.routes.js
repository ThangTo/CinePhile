const express = require("express");
const router = express.Router();
const crawlerController = require("../controllers/crawler.controller");

// Đường dẫn sẽ là: /api/crawl/trigger?page=1
router.get("/trigger", crawlerController.triggerCrawl);
// router.get("/range",crawlerController.runPageRange);
router.get('/range', crawlerController.runPageRange);
module.exports = router;