import React, { useState } from "react";
import {
  FiX,
  FiFilm,
  FiSearch,
  FiPlay,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiDownload,
  FiList,
} from "react-icons/fi";
import { movieAPI } from "services/admin.service";

const MovieCrawlModal = ({ isOpen, onClose, onCrawlSuccess }) => {
  const [activeTab, setActiveTab] = useState("name"); // "page" or "name" - default to "name"
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Tab 1: Crawl by Page
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState("");
  const [crawlUntilEnd, setCrawlUntilEnd] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(null);
  const [crawlLogs, setCrawlLogs] = useState([]);

  // Tab 2: Crawl by Name
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState(new Set());
  const [crawlingMovies, setCrawlingMovies] = useState(new Set());

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setActiveTab("name");
      setStartPage(1);
      setEndPage("");
      setCrawlUntilEnd(false);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMovies(new Set());
      setCrawlingMovies(new Set());
      setError(null);
      setSuccess(null);
      setCrawlProgress(null);
      setCrawlLogs([]);
    }
  }, [isOpen]);

  // Tab 1: Handle crawl by page
  const handleCrawlByPage = async () => {
    if (startPage < 1) {
      setError("Trang bắt đầu phải lớn hơn 0");
      return;
    }

    if (!crawlUntilEnd && (!endPage || endPage < 1 || startPage > endPage)) {
      setError("Trang kết thúc phải lớn hơn hoặc bằng trang bắt đầu");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCrawlLogs([]);
    setCrawlProgress({ current: startPage, total: crawlUntilEnd ? null : parseInt(endPage) });

    try {
      const params = {
        startPage: parseInt(startPage),
        endPage: crawlUntilEnd ? null : parseInt(endPage),
      };

      await movieAPI.crawlByPage(params, (data) => {
        if (data.type === 'log') {
          setCrawlLogs((prev) => [...prev, { type: 'log', message: data.message, timestamp: new Date() }]);
        } else if (data.type === 'error') {
          setCrawlLogs((prev) => [...prev, { type: 'error', message: data.message, timestamp: new Date() }]);
        } else if (data.type === 'complete') {
          setSuccess(`Đã crawl thành công ${data.movies_count || 0} phim từ trang ${startPage}${crawlUntilEnd ? ' đến hết' : ` đến ${endPage}`}`);
          setCrawlProgress(null);
          if (onCrawlSuccess) {
            onCrawlSuccess();
          }
          setIsLoading(false);
        } else if (data.page) {
          setCrawlProgress({ current: data.page, total: crawlUntilEnd ? null : parseInt(endPage) });
        }
      });
    } catch (err) {
      setError(err?.message || "Có lỗi xảy ra khi crawl");
      setCrawlProgress(null);
      setIsLoading(false);
    }
  };

  // Tab 2: Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Vui lòng nhập tên phim");
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults([]);
    setSelectedMovies(new Set());

    try {
      const results = await movieAPI.searchForCrawl(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        setError("Không tìm thấy phim nào");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi tìm kiếm");
    } finally {
      setIsSearching(false);
    }
  };

  // Tab 2: Toggle movie selection
  const toggleMovieSelection = (slug) => {
    const newSelected = new Set(selectedMovies);
    if (newSelected.has(slug)) {
      newSelected.delete(slug);
    } else {
      newSelected.add(slug);
    }
    setSelectedMovies(newSelected);
  };

  // Tab 2: Crawl selected movies
  const handleCrawlSelected = async () => {
    if (selectedMovies.size === 0) {
      setError("Vui lòng chọn ít nhất một phim");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCrawlingMovies(new Set(selectedMovies));

    let successCount = 0;
    let failCount = 0;

    try {
      for (const slug of selectedMovies) {
        try {
          await movieAPI.crawlBySlug(slug);
          successCount++;
        } catch (err) {
          failCount++;
          console.error(`Failed to crawl ${slug}:`, err);
        }
        // Delay between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setSuccess(`Đã crawl thành công ${successCount} phim${failCount > 0 ? `, thất bại ${failCount} phim` : ""}`);
      setCrawlingMovies(new Set());
      setSelectedMovies(new Set());
      
      if (onCrawlSuccess) {
        onCrawlSuccess();
      }
    } catch (err) {
      setError(err?.message || "Có lỗi xảy ra khi crawl");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl h-[90vh] bg-bgColor3 rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/10 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primaryColor/20 text-primaryColor">
              <FiDownload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Crawl Phim Từ API</h2>
              <p className="text-xs text-gray-400">Chọn phương thức crawl phim</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Tabs - Only show "Crawl Theo Tên" tab */}
        {/* Tab navigation hidden - only showing crawl by name */}

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 text-red-200">
              <FiAlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-500/50 rounded-xl p-4 flex items-center gap-3 text-green-200">
              <FiCheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          {/* Tab 1: Crawl by Page - HIDDEN */}
          {false && activeTab === "page" && (
            <div className="space-y-6">
              <div className="bg-black/10 rounded-xl p-5 border border-white/5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <FiList className="text-primaryColor" />
                  Crawl Phim Theo Trang
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Crawl phim từ trang bắt đầu đến trang kết thúc. Mỗi trang thường có khoảng 10 phim.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                      Trang Bắt Đầu
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={startPage}
                      onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primaryColor"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                      Trang Kết Thúc
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={endPage}
                      onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primaryColor"
                    />
                  </div>
                </div>

                {crawlProgress && (
                  <div className="mt-4 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-200 text-sm">Đang crawl...</span>
                      <span className="text-blue-200 text-sm">
                        Trang {crawlProgress.current}{crawlProgress.total ? ` / ${crawlProgress.total}` : " (đến hết)"}
                      </span>
                    </div>
                    {crawlProgress.total && (
                      <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(crawlProgress.current / crawlProgress.total) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Logs Display */}
                {crawlLogs.length > 0 && (
                  <div className="mt-4 bg-black/20 border border-white/5 rounded-xl p-4 max-h-96 overflow-y-auto custom-scrollbar">
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                      <FiList className="text-primaryColor" />
                      Logs Crawl
                    </h4>
                    <div className="space-y-1 font-mono text-xs">
                      {crawlLogs.map((log, index) => (
                        <div
                          key={index}
                          className={`${
                            log.type === 'error' ? 'text-red-400' : 'text-gray-300'
                          } whitespace-pre-wrap`}
                        >
                          {log.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCrawlByPage}
                  disabled={isLoading}
                  className="mt-6 w-full px-6 py-3 rounded-xl bg-primaryColor text-black font-bold shadow-lg shadow-primaryColor/20 hover:shadow-primaryColor/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <FiLoader className="animate-spin" size={20} />
                      <span>Đang crawl...</span>
                    </>
                  ) : (
                    <>
                      <FiPlay size={20} />
                      <span>Bắt Đầu Crawl</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Crawl by Name */}
          {activeTab === "name" && (
            <div className="space-y-6">
              <div className="bg-black/10 rounded-xl p-5 border border-white/5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <FiSearch className="text-primaryColor" />
                  Tìm Kiếm Phim
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Nhập tên phim để tìm kiếm, sau đó chọn các phim bạn muốn crawl.
                </p>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Nhập tên phim..."
                    className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-6 py-3 rounded-xl bg-primaryColor text-black font-bold hover:bg-primaryColor/90 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSearching ? (
                      <FiLoader className="animate-spin" size={20} />
                    ) : (
                      <FiSearch size={20} />
                    )}
                    <span>Tìm</span>
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="bg-black/10 rounded-xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <FiFilm className="text-primaryColor" />
                      Kết Quả Tìm Kiếm ({searchResults.length})
                    </h3>
                    {selectedMovies.size > 0 && (
                      <button
                        onClick={handleCrawlSelected}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-primaryColor text-black font-bold text-sm hover:bg-primaryColor/90 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isLoading ? (
                          <FiLoader className="animate-spin" size={16} />
                        ) : (
                          <FiDownload size={16} />
                        )}
                        <span>Crawl {selectedMovies.size} Phim</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto custom-scrollbar">
                    {searchResults.map((movie, index) => {
                      const isSelected = selectedMovies.has(movie.slug);
                      const isCrawling = crawlingMovies.has(movie.slug);
                      const similarity = movie.similarity
                        ? `${(movie.similarity * 100).toFixed(0)}%`
                        : "N/A";

                      return (
                        <div
                          key={movie.slug || index}
                          className={`relative bg-black/20 rounded-xl p-4 border-2 transition-all cursor-pointer ${
                            isSelected
                              ? "border-primaryColor bg-primaryColor/10"
                              : "border-white/5 hover:border-white/20"
                          } ${isCrawling ? "opacity-50" : ""}`}
                          onClick={() => !isCrawling && toggleMovieSelection(movie.slug)}
                        >
                          {isCrawling && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-10">
                              <FiLoader className="animate-spin text-primaryColor" size={24} />
                            </div>
                          )}

                          <div className="flex gap-4">
                            {/* Poster hidden */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold text-sm truncate mb-1">
                                {movie.name}
                              </h4>
                              {movie.origin_name && (
                                <p className="text-gray-400 text-xs italic truncate mb-2">
                                  {movie.origin_name}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>Khớp: {similarity}</span>
                                {movie.year && <span>• {movie.year}</span>}
                              </div>
                              {isSelected && (
                                <div className="mt-2 flex items-center gap-1 text-primaryColor text-xs">
                                  <FiCheckCircle size={14} />
                                  <span>Đã chọn</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/20 border-t border-white/10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-gray-400 font-medium hover:bg-white/5 hover:text-white transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovieCrawlModal;

