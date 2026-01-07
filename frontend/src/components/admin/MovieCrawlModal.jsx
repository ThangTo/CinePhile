import React, { useState, useRef } from "react";
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
  FiSquare,
} from "react-icons/fi";
import { movieAPI } from "services/admin.service";
import OptimizedImage from "components/common/OptimizedImage";
import Select from "components/common/Select";

// Reusable card for search/genre results
const CrawlResultCard = ({ movie, isSelected, isCrawling, onToggle, showSimilarity = false }) => {
  const existsInDb = movie.existsInDb;
  const similarity = showSimilarity
    ? movie.similarity
      ? `${(movie.similarity * 100).toFixed(0)}%`
      : "N/A"
    : null;

  return (
    <div
      className={`relative bg-black/20 rounded-xl p-4 border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-primaryColor bg-primaryColor/10"
          : existsInDb
          ? "border-emerald-500/60 bg-emerald-500/5 hover:border-emerald-400/80"
          : "border-white/5 hover:border-white/20"
      } ${isCrawling ? "opacity-50" : ""}`}
      onClick={onToggle}
    >
      {isCrawling && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-10">
          <FiLoader className="animate-spin text-primaryColor" size={24} />
        </div>
      )}

      <div className="flex gap-4">
        {/* Poster */}
        {(movie.poster_url || movie.thumb_url) && (
          <div className="relative w-20 h-28 flex-shrink-0 rounded overflow-hidden shadow-lg">
            <OptimizedImage
              src={movie.poster_url || movie.thumb_url || null}
              alt={movie.name}
              className="w-full h-full object-cover"
              sizeKey="THUMBNAIL"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-bold text-sm mb-1">{movie.name}</h4>
          {movie.origin_name && (
            <p className="text-gray-400 text-xs italic truncate mb-2">{movie.origin_name}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
            {showSimilarity && similarity && (
              <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                Khớp: {similarity}
              </span>
            )}
            {movie.year && (
              <span className="bg-gray-500/20 text-gray-300 px-2 py-0.5 rounded">{movie.year}</span>
            )}
            {movie.quality && (
              <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                {movie.quality}
              </span>
            )}
            {movie.time && (
              <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                {movie.time}
              </span>
            )}
            {existsInDb && (
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                Đã có trong DB
              </span>
            )}
          </div>
          {movie.lang && <p className="text-gray-500 text-xs mb-1">Ngôn ngữ: {movie.lang}</p>}
          {movie.category && Array.isArray(movie.category) && movie.category.length > 0 && (
            <p className="text-gray-500 text-xs mb-1">
              Thể loại: {movie.category.map((c) => c.name || c).join(", ")}
            </p>
          )}
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
};

const MovieCrawlModal = ({ isOpen, onClose, onCrawlSuccess }) => {
  const [activeTab, setActiveTab] = useState("page"); // "page", "name", or "genre"
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // AbortController để hủy crawl
  const abortControllerRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Tab 1: Crawl by Page
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState("");
  const [crawlUntilEnd, setCrawlUntilEnd] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(null);
  const [crawlLogs, setCrawlLogs] = useState([]);

  // Tab 2: Crawl by Name
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState(new Set());
  const [crawlingMovies, setCrawlingMovies] = useState(new Set());
  const [namePage, setNamePage] = useState(1);
  const [nameSortField, setNameSortField] = useState("modified.time");
  const [nameSortType, setNameSortType] = useState("desc");
  const [nameSortLang, setNameSortLang] = useState("");
  const [nameCategory, setNameCategory] = useState("");
  const [nameCountry, setNameCountry] = useState("");
  const [nameYear, setNameYear] = useState("");
  const [nameLimit, setNameLimit] = useState(20);

  // Tab 3: Crawl by Genre
  const [genreTypeList, setGenreTypeList] = useState("");
  const [genrePage, setGenrePage] = useState(1);
  const [genreSortField, setGenreSortField] = useState("_id");
  const [genreSortType, setGenreSortType] = useState("asc");
  const [genreSortLang, setGenreSortLang] = useState("");
  const [genreCountry, setGenreCountry] = useState("");
  const [genreYear, setGenreYear] = useState("");
  const [genreLimit, setGenreLimit] = useState(10);
  const [genreResults, setGenreResults] = useState([]);
  const [isSearchingGenre, setIsSearchingGenre] = useState(false);
  const [selectedGenreMovies, setSelectedGenreMovies] = useState(new Set());
  const [crawlingGenreMovies, setCrawlingGenreMovies] = useState(new Set());

  // Danh sách thể loại phổ biến
  const GENRE_OPTIONS = [
    { value: "hanh-dong", label: "Hành Động" },
    { value: "kinh-di", label: "Kinh Dị" },
    { value: "hai-huoc", label: "Hài Hước" },
    { value: "lang-man", label: "Lãng Mạn" },
    { value: "tam-ly", label: "Tâm Lý" },
    { value: "vien-tuong", label: "Viễn Tưởng" },
    { value: "phieu-luu", label: "Phiêu Lưu" },
    { value: "vo-thuat", label: "Võ Thuật" },
    { value: "co-trang", label: "Cổ Trang" },
    { value: "chien-tranh", label: "Chiến Tranh" },
    { value: "tai-lieu", label: "Tài Liệu" },
    { value: "hoat-hinh", label: "Hoạt Hình" },
    { value: "gia-dinh", label: "Gia Đình" },
    { value: "am-nhac", label: "Âm Nhạc" },
    { value: "the-thao", label: "Thể Thao" },
  ];

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      // Hủy crawl nếu đang chạy
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isCancelledRef.current = false;

      setActiveTab("page");
      setStartPage(1);
      setEndPage("");
      setCrawlUntilEnd(false);
      setSkipExisting(false);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMovies(new Set());
      setCrawlingMovies(new Set());
      setGenreTypeList("");
      setGenrePage(1);
      setGenreSortField("_id");
      setGenreSortType("asc");
      setGenreSortLang("");
      setGenreCountry("");
      setGenreYear("");
      setGenreLimit(10);
      setGenreResults([]);
      setSelectedGenreMovies(new Set());
      setCrawlingGenreMovies(new Set());
      setError(null);
      setSuccess(null);
      setCrawlProgress(null);
      setCrawlLogs([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Hàm hủy crawl
  const handleCancelCrawl = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      isCancelledRef.current = true;
      setIsLoading(false);
      setCrawlProgress(null);
      setError("Crawl đã bị hủy bởi người dùng");
      setCrawlLogs((prev) => [
        ...prev,
        { type: "error", message: "❌ Crawl đã bị hủy", timestamp: new Date() },
      ]);
    }
  };

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

    // Tạo AbortController mới
    abortControllerRef.current = new AbortController();
    isCancelledRef.current = false;

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCrawlLogs([]);
    setCrawlProgress({ current: startPage, total: crawlUntilEnd ? null : parseInt(endPage) });

    try {
      const params = {
        startPage: parseInt(startPage),
        endPage: crawlUntilEnd ? null : parseInt(endPage),
        skipExisting: skipExisting,
      };

      await movieAPI.crawlByPage(
        params,
        (data) => {
          // Kiểm tra nếu đã bị hủy
          if (isCancelledRef.current) {
            return;
          }

          if (data.type === "log") {
            setCrawlLogs((prev) => [
              ...prev,
              { type: "log", message: data.message, timestamp: new Date() },
            ]);
          } else if (data.type === "error") {
            setCrawlLogs((prev) => [
              ...prev,
              { type: "error", message: data.message, timestamp: new Date() },
            ]);
          } else if (data.type === "complete") {
            setSuccess(
              `Đã crawl thành công ${data.movies_count || 0} phim từ trang ${startPage}${
                crawlUntilEnd ? " đến hết" : ` đến ${endPage}`
              }`
            );
            setCrawlProgress(null);
            if (onCrawlSuccess) {
              onCrawlSuccess();
            }
            setIsLoading(false);
            abortControllerRef.current = null;
          } else if (data.page) {
            setCrawlProgress({
              current: data.page,
              total: crawlUntilEnd ? null : parseInt(endPage),
            });
          }
        },
        abortControllerRef.current
      );
    } catch (err) {
      if (isCancelledRef.current) {
        // Đã bị hủy, không cần set error nữa
        return;
      }
      setError(err?.message || "Có lỗi xảy ra khi crawl");
      setCrawlProgress(null);
      setIsLoading(false);
      abortControllerRef.current = null;
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
      const results = await movieAPI.searchForCrawl({
        movieName: searchQuery.trim(),
        page: namePage,
        sort_field: nameSortField,
        sort_type: nameSortType,
        sort_lang: nameSortLang || undefined,
        category: nameCategory || undefined,
        country: nameCountry || undefined,
        year: nameYear || undefined,
        limit: nameLimit,
      });
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

    // Tạo AbortController mới
    abortControllerRef.current = new AbortController();
    isCancelledRef.current = false;

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCrawlingMovies(new Set(selectedMovies));

    let successCount = 0;
    let failCount = 0;
    const moviesArray = Array.from(selectedMovies);

    try {
      for (let i = 0; i < moviesArray.length; i++) {
        // Kiểm tra nếu đã bị hủy
        if (isCancelledRef.current) {
          break;
        }

        const slug = moviesArray[i];
        try {
          await movieAPI.crawlBySlug(slug);
          successCount++;

          // Cập nhật crawlingMovies để loại bỏ phim đã crawl xong
          setCrawlingMovies((prev) => {
            const newSet = new Set(prev);
            newSet.delete(slug);
            return newSet;
          });
        } catch (err) {
          failCount++;
          console.error(`Failed to crawl ${slug}:`, err);

          // Cập nhật crawlingMovies để loại bỏ phim lỗi
          setCrawlingMovies((prev) => {
            const newSet = new Set(prev);
            newSet.delete(slug);
            return newSet;
          });
        }

        // Delay between requests (chỉ nếu chưa bị hủy)
        if (!isCancelledRef.current && i < moviesArray.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (isCancelledRef.current) {
        setError("Crawl đã bị hủy bởi người dùng");
        setSuccess(
          `Đã crawl ${successCount} phim trước khi hủy${
            failCount > 0 ? `, thất bại ${failCount} phim` : ""
          }`
        );
      } else {
        setSuccess(
          `Đã crawl thành công ${successCount} phim${
            failCount > 0 ? `, thất bại ${failCount} phim` : ""
          }`
        );
      }

      setCrawlingMovies(new Set());
      setSelectedMovies(new Set());

      if (onCrawlSuccess && !isCancelledRef.current) {
        onCrawlSuccess();
      }
    } catch (err) {
      if (!isCancelledRef.current) {
        setError(err?.message || "Có lỗi xảy ra khi crawl");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Tab 3: Handle search by genre
  const handleSearchByGenre = async () => {
    if (!genreTypeList.trim()) {
      setError("Vui lòng chọn thể loại");
      return;
    }

    setIsSearchingGenre(true);
    setError(null);
    setGenreResults([]);
    setSelectedGenreMovies(new Set());

    try {
      const results = await movieAPI.searchByGenre({
        type_list: genreTypeList.trim(),
        page: genrePage,
        sort_field: genreSortField,
        sort_type: genreSortType,
        sort_lang: genreSortLang || undefined,
        country: genreCountry || undefined,
        year: genreYear || undefined,
        limit: genreLimit,
      });
      setGenreResults(results);
      if (results.length === 0) {
        setError("Không tìm thấy phim nào");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi tìm kiếm");
    } finally {
      setIsSearchingGenre(false);
    }
  };

  // Tab 3: Toggle movie selection
  const toggleGenreMovieSelection = (slug) => {
    const newSelected = new Set(selectedGenreMovies);
    if (newSelected.has(slug)) {
      newSelected.delete(slug);
    } else {
      newSelected.add(slug);
    }
    setSelectedGenreMovies(newSelected);
  };

  // Tab 3: Select all movies (skip ones already in DB)
  const handleSelectAllGenreMovies = () => {
    const allSlugs = genreResults
      .filter((movie) => movie.slug && !crawlingGenreMovies.has(movie.slug) && !movie.existsInDb)
      .map((movie) => movie.slug);
    setSelectedGenreMovies(new Set(allSlugs));
  };

  // Tab 3: Deselect all movies
  const handleDeselectAllGenreMovies = () => {
    setSelectedGenreMovies(new Set());
  };

  const genreMoviesInDb = genreResults.filter((movie) => movie.existsInDb);

  // Tab 3: Crawl selected movies
  const handleCrawlGenreSelected = async () => {
    if (selectedGenreMovies.size === 0) {
      setError("Vui lòng chọn ít nhất một phim");
      return;
    }

    // Tạo AbortController mới
    abortControllerRef.current = new AbortController();
    isCancelledRef.current = false;

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCrawlingGenreMovies(new Set(selectedGenreMovies));

    let successCount = 0;
    let failCount = 0;
    const moviesArray = Array.from(selectedGenreMovies);

    try {
      for (let i = 0; i < moviesArray.length; i++) {
        // Kiểm tra nếu đã bị hủy
        if (isCancelledRef.current) {
          break;
        }

        const slug = moviesArray[i];
        try {
          await movieAPI.crawlBySlug(slug);
          successCount++;

          // Cập nhật crawlingGenreMovies để loại bỏ phim đã crawl xong
          setCrawlingGenreMovies((prev) => {
            const newSet = new Set(prev);
            newSet.delete(slug);
            return newSet;
          });
        } catch (err) {
          failCount++;
          console.error(`Failed to crawl ${slug}:`, err);

          // Cập nhật crawlingGenreMovies để loại bỏ phim lỗi
          setCrawlingGenreMovies((prev) => {
            const newSet = new Set(prev);
            newSet.delete(slug);
            return newSet;
          });
        }

        // Delay between requests (chỉ nếu chưa bị hủy)
        if (!isCancelledRef.current && i < moviesArray.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (isCancelledRef.current) {
        setError("Crawl đã bị hủy bởi người dùng");
        setSuccess(
          `Đã crawl ${successCount} phim trước khi hủy${
            failCount > 0 ? `, thất bại ${failCount} phim` : ""
          }`
        );
      } else {
        setSuccess(
          `Đã crawl thành công ${successCount} phim${
            failCount > 0 ? `, thất bại ${failCount} phim` : ""
          }`
        );
      }

      setCrawlingGenreMovies(new Set());
      setSelectedGenreMovies(new Set());

      if (onCrawlSuccess && !isCancelledRef.current) {
        onCrawlSuccess();
      }
    } catch (err) {
      if (!isCancelledRef.current) {
        setError(err?.message || "Có lỗi xảy ra khi crawl");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 mt-0">
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

        {/* Tabs Navigation */}
        <div className="px-6 pt-4 border-b border-white/10">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("page")}
              className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                activeTab === "page"
                  ? "bg-bgColor3 text-primaryColor border-t-2 border-primaryColor"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <FiList size={18} />
                <span>Crawl Theo Trang</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("name")}
              className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                activeTab === "name"
                  ? "bg-bgColor3 text-primaryColor border-t-2 border-primaryColor"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <FiSearch size={18} />
                <span>Crawl Theo Tên</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("genre")}
              className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                activeTab === "genre"
                  ? "bg-bgColor3 text-primaryColor border-t-2 border-primaryColor"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <FiFilm size={18} />
                <span>Crawl Theo Thể Loại</span>
              </div>
            </button>
          </div>
        </div>

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

          {/* Tab 1: Crawl by Page */}
          {activeTab === "page" && (
            <div className="space-y-6">
              <div className="bg-black/10 rounded-xl p-5 border border-white/5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <FiList className="text-primaryColor" />
                  Crawl Phim Theo Trang
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Crawl phim từ trang bắt đầu đến trang kết thúc. Mỗi trang thường có khoảng 10
                  phim.
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
                      onChange={(e) => setEndPage(e.target.value ? parseInt(e.target.value) : "")}
                      disabled={crawlUntilEnd}
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primaryColor disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="crawlUntilEnd"
                      checked={crawlUntilEnd}
                      onChange={(e) => setCrawlUntilEnd(e.target.checked)}
                      className="w-4 h-4 rounded bg-black/20 border-white/5 text-primaryColor focus:ring-primaryColor focus:ring-2"
                    />
                    <label htmlFor="crawlUntilEnd" className="text-sm text-gray-300 cursor-pointer">
                      Crawl đến hết (bỏ qua trang kết thúc)
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="skipExisting"
                      checked={skipExisting}
                      onChange={(e) => setSkipExisting(e.target.checked)}
                      className="w-4 h-4 rounded bg-black/20 border-white/5 text-primaryColor focus:ring-primaryColor focus:ring-2"
                    />
                    <label htmlFor="skipExisting" className="text-sm text-gray-300 cursor-pointer">
                      Bỏ qua phim đã tồn tại
                    </label>
                  </div>
                </div>

                {crawlProgress && (
                  <div className="mt-4 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-200 text-sm">Đang crawl...</span>
                      <span className="text-blue-200 text-sm">
                        Trang {crawlProgress.current}
                        {crawlProgress.total ? ` / ${crawlProgress.total}` : " (đến hết)"}
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
                            log.type === "error" ? "text-red-400" : "text-gray-300"
                          } whitespace-pre-wrap`}
                        >
                          {log.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  {isLoading ? (
                    <button
                      onClick={handleCancelCrawl}
                      className="flex-1 px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 font-bold hover:bg-red-500/30 hover:border-red-500/70 transition-all flex items-center justify-center gap-2"
                    >
                      <FiSquare size={20} />
                      <span>Hủy Crawl</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleCrawlByPage}
                      disabled={isLoading}
                      className="w-full px-6 py-3 rounded-xl bg-primaryColor text-black font-bold shadow-lg shadow-primaryColor/20 hover:shadow-primaryColor/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <FiPlay size={20} />
                      <span>Bắt Đầu Crawl</span>
                    </button>
                  )}
                </div>
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
                  Nhập từ khóa và bộ lọc nâng cao để tìm phim, sau đó chọn các phim bạn muốn crawl.
                </p>

                {/* Keyword + Search Button */}
                <div className="flex flex-col lg:flex-row gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Nhập tên phim..."
                    className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
                  />
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min="1"
                      value={namePage}
                      onChange={(e) => setNamePage(parseInt(e.target.value) || 1)}
                      className="w-24 bg-black/20 border border-white/5 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-primaryColor"
                      placeholder="Trang"
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

                {/* Advanced Filters */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sort Field */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                      Sắp xếp theo
                    </label>
                    <Select
                      value={nameSortField}
                      onChange={setNameSortField}
                      options={[
                        { value: "modified.time", label: "Thời gian cập nhật" },
                        { value: "_id", label: "ID" },
                        { value: "year", label: "Năm phát hành" },
                      ]}
                      size="sm"
                    />
                  </div>

                  {/* Sort Type */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                      Thứ tự
                    </label>
                    <Select
                      value={nameSortType}
                      onChange={setNameSortType}
                      options={[
                        { value: "desc", label: "Giảm dần" },
                        { value: "asc", label: "Tăng dần" },
                      ]}
                      size="sm"
                    />
                  </div>

                  {/* Sort Lang */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                      Ngôn ngữ
                    </label>
                    <Select
                      value={nameSortLang}
                      onChange={setNameSortLang}
                      options={[
                        { value: "", label: "Tất cả" },
                        { value: "vietsub", label: "Vietsub" },
                        { value: "thuyet-minh", label: "Thuyết minh" },
                        { value: "long-tieng", label: "Lồng tiếng" },
                      ]}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                      Thể loại (slug)
                    </label>
                    <input
                      type="text"
                      value={nameCategory}
                      onChange={(e) => setNameCategory(e.target.value)}
                      placeholder="vd: hanh-dong"
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Lấy slug từ API <span className="underline">phimapi.com/the-loai</span>
                    </p>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                      Quốc gia (slug)
                    </label>
                    <input
                      type="text"
                      value={nameCountry}
                      onChange={(e) => setNameCountry(e.target.value)}
                      placeholder="vd: han-quoc"
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Lấy slug từ API <span className="underline">phimapi.com/quoc-gia</span>
                    </p>
                  </div>

                  {/* Year + Limit */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                        Năm
                      </label>
                      <input
                        type="number"
                        min="1970"
                        max={new Date().getFullYear()}
                        value={nameYear}
                        onChange={(e) => setNameYear(e.target.value)}
                        placeholder="vd: 2024"
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                        Giới hạn
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="64"
                        value={nameLimit}
                        onChange={(e) => setNameLimit(parseInt(e.target.value) || 20)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primaryColor"
                      />
                    </div>
                  </div>
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
                    <div className="flex items-center gap-2">
                      {isLoading && (
                        <button
                          onClick={handleCancelCrawl}
                          className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 font-bold text-sm hover:bg-red-500/30 transition-all flex items-center gap-2"
                        >
                          <FiSquare size={16} />
                          <span>Hủy</span>
                        </button>
                      )}
                      {selectedMovies.size > 0 && !isLoading && (
                        <button
                          onClick={handleCrawlSelected}
                          disabled={isLoading}
                          className="px-4 py-2 rounded-lg bg-primaryColor text-black font-bold text-sm hover:bg-primaryColor/90 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          <FiDownload size={16} />
                          <span>Crawl {selectedMovies.size} Phim</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto custom-scrollbar">
                    {searchResults.map((movie, index) => {
                      const isSelected = selectedMovies.has(movie.slug);
                      const isCrawling = crawlingMovies.has(movie.slug);
                      return (
                        <CrawlResultCard
                          key={movie.slug || index}
                          movie={movie}
                          isSelected={isSelected}
                          isCrawling={isCrawling}
                          onToggle={() => !isCrawling && toggleMovieSelection(movie.slug)}
                          showSimilarity
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Crawl by Genre */}
          {activeTab === "genre" && (
            <div className="space-y-6">
              <div className="bg-black/10 rounded-xl p-5 border border-white/5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <FiFilm className="text-primaryColor" />
                  Tìm Kiếm Phim Theo Thể Loại
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Chọn thể loại và các bộ lọc để tìm kiếm phim, sau đó chọn các phim bạn muốn crawl.
                </p>

                <div className="space-y-4">
                  {/* Genre Selection */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                      Thể Loại *
                    </label>
                    <Select
                      value={genreTypeList}
                      onChange={setGenreTypeList}
                      options={GENRE_OPTIONS}
                      placeholder="-- Chọn thể loại --"
                      bgColor="bg-black/20"
                      bgDropdown="bg-bgColor"
                      className="py-3"
                    />
                  </div>

                  {/* Filters Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                        Trang
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={genrePage}
                        onChange={(e) => setGenrePage(parseInt(e.target.value) || 1)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primaryColor"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                        Sắp xếp theo
                      </label>
                      <Select
                        value={genreSortField}
                        onChange={setGenreSortField}
                        options={[
                          { value: "_id", label: "ID" },
                          { value: "year", label: "Năm" },
                          { value: "name", label: "Tên" },
                          { value: "time", label: "Thời lượng" },
                        ]}
                        className="py-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                        Thứ tự
                      </label>
                      <Select
                        value={genreSortType}
                        onChange={setGenreSortType}
                        options={[
                          { value: "asc", label: "Tăng dần" },
                          { value: "desc", label: "Giảm dần" },
                        ]}
                        className="py-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                        Giới hạn
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={genreLimit}
                        onChange={(e) => setGenreLimit(parseInt(e.target.value) || 10)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primaryColor"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                        Ngôn ngữ
                      </label>
                      <Select
                        value={genreSortLang}
                        onChange={setGenreSortLang}
                        options={[
                          { value: "", label: "Tất cả" },
                          { value: "long-tieng", label: "Lồng tiếng" },
                          { value: "thuyet-minh", label: "Thuyết minh" },
                          { value: "vietsub", label: "Phụ đề" },
                        ]}
                        className="py-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                        Quốc gia
                      </label>
                      <input
                        type="text"
                        value={genreCountry}
                        onChange={(e) => setGenreCountry(e.target.value)}
                        placeholder="vd: trung-quoc"
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                        Năm
                      </label>
                      <input
                        type="number"
                        value={genreYear}
                        onChange={(e) => setGenreYear(e.target.value)}
                        placeholder="vd: 2024"
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSearchByGenre}
                    disabled={isSearchingGenre || !genreTypeList}
                    className="w-full px-6 py-3 rounded-xl bg-primaryColor text-black font-bold hover:bg-primaryColor/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSearchingGenre ? (
                      <FiLoader className="animate-spin" size={20} />
                    ) : (
                      <FiSearch size={20} />
                    )}
                    <span>Tìm Kiếm</span>
                  </button>
                </div>
              </div>

              {/* Genre Search Results */}
              {genreResults.length > 0 && (
                <div className="bg-black/10 rounded-xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <FiFilm className="text-primaryColor" />
                      Kết Quả Tìm Kiếm ({genreResults.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      {!isLoading && genreResults.length > 0 && (
                        <>
                          {selectedGenreMovies.size > 0 &&
                          selectedGenreMovies.size ===
                            genreResults.length - genreMoviesInDb.length ? (
                            <button
                              onClick={handleDeselectAllGenreMovies}
                              className="px-4 py-2 rounded-lg bg-gray-500/20 border border-gray-500/50 text-gray-200 font-bold text-sm hover:bg-gray-500/30 transition-all flex items-center gap-2"
                            >
                              <FiSquare size={16} />
                              <span>Bỏ chọn tất cả</span>
                            </button>
                          ) : (
                            <button
                              onClick={handleSelectAllGenreMovies}
                              className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-200 font-bold text-sm hover:bg-blue-500/30 transition-all flex items-center gap-2"
                            >
                              <FiCheckCircle size={16} />
                              <span>Chọn tất cả</span>
                            </button>
                          )}
                        </>
                      )}
                      {isLoading && (
                        <button
                          onClick={handleCancelCrawl}
                          className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 font-bold text-sm hover:bg-red-500/30 transition-all flex items-center gap-2"
                        >
                          <FiSquare size={16} />
                          <span>Hủy</span>
                        </button>
                      )}
                      {selectedGenreMovies.size > 0 && !isLoading && (
                        <button
                          onClick={handleCrawlGenreSelected}
                          disabled={isLoading}
                          className="px-4 py-2 rounded-lg bg-primaryColor text-black font-bold text-sm hover:bg-primaryColor/90 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          <FiDownload size={16} />
                          <span>Crawl {selectedGenreMovies.size} Phim</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto custom-scrollbar">
                    {genreResults.map((movie, index) => {
                      const isSelected = selectedGenreMovies.has(movie.slug);
                      const isCrawling = crawlingGenreMovies.has(movie.slug);
                      return (
                        <CrawlResultCard
                          key={movie.slug || index}
                          movie={movie}
                          isSelected={isSelected}
                          isCrawling={isCrawling}
                          onToggle={() => !isCrawling && toggleGenreMovieSelection(movie.slug)}
                          showSimilarity={false}
                        />
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
