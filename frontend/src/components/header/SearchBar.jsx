import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import movieService from "services/movie.service";
import LoadingState from "components/common/LoadingState";
import { groupSeriesMovies } from "utils/seriesGrouping";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_DELAY = 400;

const SearchBar = ({ className = "", placeholder = "Tìm kiếm phim, diễn viên..." }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const handle = setTimeout(async () => {
      try {
        const res = await movieService.search(query.trim(), { limit: 6, page: 1 });
        const movies = res?.data || [];
        const grouped = groupSeriesMovies(movies);
        setResults(grouped);
        setIsOpen(true);
      } catch (err) {
        console.error("Search error:", err);
        setError("Không thể tìm kiếm phim lúc này.");
        setResults([]);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handle);
  }, [query]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setIsOpen(false);
  };

  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          className="w-full bg-bgColor text-gray-200 placeholder:text-gray-400 rounded-full pl-11 pr-4 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-3.85z"
          />
        </svg>
      </form>

      {/* Dropdown kết quả */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-bgColor2/90 backdrop-blur border border-white/10 rounded-2xl shadow-2xl z-40">
          {/* Đang loading */}
          {isLoading ? (
            <div className="py-4">
              <LoadingState className="py-4 bg-transparent min-h-0" />
            </div>
          ) : error ? (
            <div className="py-4 px-4 text-sm text-red-400">{error}</div>
          ) : results.length === 0 ? (
            <div className="py-4 px-4 text-sm text-gray-300">
              Không tìm thấy phim cho từ khóa "{query.trim()}"
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-gray-200">Danh sách phim</p>
              </div>

              <ul className="divide-y divide-white/5">
                {results.map((movie) => (
                  <li key={movie.id}>
                    <button
                      type="button"
                      onClick={() => handleMovieClick(movie.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left"
                    >
                      <div className="flex-shrink-0 w-10 h-14 rounded-md overflow-hidden bg-bgColor4">
                        {movie.poster && (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{movie.title}</p>
                        {movie.englishTitle && (
                          <p className="text-xs text-gray-400 truncate">{movie.englishTitle}</p>
                        )}
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                          {movie.ageRating && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-white/10 text-[10px] font-semibold text-amber-300">
                              {movie.ageRating}
                            </span>
                          )}
                          {movie.year && (
                            <span className="before:content-['•'] before:mx-1 before:text-gray-500">
                              {movie.year}
                            </span>
                          )}
                          {movie.duration && (
                            <span className="before:content-['•'] before:mx-1 before:text-gray-500">
                              {movie.duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="px-4 py-3 border-t border-white/10">
                <button
                  type="button"
                  className="w-full text-center text-sm font-semibold text-primaryColor hover:text-primaryColor/80"
                  onClick={() => {
                    const trimmed = query.trim();
                    if (!trimmed) return;
                    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
                    setIsOpen(false);
                  }}
                >
                  Toàn bộ kết quả
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
