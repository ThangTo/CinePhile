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

const runPageRange = async (req,res) =>{
  try{
    const startPage = parseInt(req.query.from) || 1;
    const endPage = parseInt(req.query.to) || 1;

    if (startPage > endPage) {
        return res.status(400).json({
            status: "error",
            message: "Tham số 'from' phải nhỏ hơn hoặc bằng 'to'."
        });
    }
    const result = await crawlerService.runPageRange(startPage, endPage);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
        status: "error",
        message: "Looix server khi craw data trong range",
        error: error.message
    })
  }

};

module.exports = {
  triggerCrawl,
  runPageRange,
};