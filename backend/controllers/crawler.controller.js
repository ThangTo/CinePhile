const crawlerService = require("../services/crawler.service");

const triggerCrawl = async (req, res) => {
  try {
    // Lấy số trang từ query, ví dụ: ?page=1
    const page = req.query.page || 1;
    
    // Gọi service
    const result = await crawlerService.crawlMovies(page);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ 
        status: "error", 
        message: "Lỗi server khi crawl data", 
        error: error.message 
    });
  }
};

module.exports = {
  triggerCrawl,
};