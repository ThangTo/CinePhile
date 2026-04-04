import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MovieViewsTag from "components/common/MovieViewsTag";
import movieService from "services/movie.service";
import OptimizedImage from "components/common/OptimizedImage";
import { BarSpinner } from "components/common/LoadingState";

const RecommendationsSection = ({ movie }) => {
  const navigate = useNavigate();
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!movie) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const movieId = movie.id || movie._id;
        const response = await movieService.getRecommendations(movieId, 10);
        const movies = response?.data || [];
        setRecommendedMovies(movies);
      } catch (err) {
        setError("Không thể tải phim gợi ý");
        setRecommendedMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [movie]);

  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
  };

  // Không hiển thị nếu không có movie
  if (!movie) {
    return null;
  }

  // Số lượng phim hiển thị khi collapsed (chỉ trên mobile)
  const MOBILE_COLLAPSED_COUNT = 3;
  const shouldShowToggle = recommendedMovies.length > MOBILE_COLLAPSED_COUNT;
  const displayedMovies =
    shouldShowToggle && !isExpanded
      ? recommendedMovies.slice(0, MOBILE_COLLAPSED_COUNT)
      : recommendedMovies;

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Phim gợi ý</h3>
        <div className="flex justify-center py-4">
          <BarSpinner />
        </div>
      </div>
    );
  }

  // Hiển thị empty state thay vì ẩn hoàn toàn
  if (error || recommendedMovies.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Phim gợi ý</h3>
        <div className="text-sm text-gray-400 py-2">{error || "Chưa có phim gợi ý"}</div>
        {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Phim gợi ý:</h3>
        {shouldShowToggle && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden flex items-center gap-1 text-sm text-primaryColor hover:text-primaryColor/80 transition-colors"
          >
            <span>
              {isExpanded
                ? "Thu gọn"
                : `Xem thêm (${recommendedMovies.length - MOBILE_COLLAPSED_COUNT})`}
            </span>
            <i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"} text-xs`} />
          </button>
        )}
      </div>

      {recommendedMovies.length > 0 ? (
        <>
          {/* Mobile: Hiển thị với collapse */}
          <div className="lg:hidden space-y-2 transition-all duration-300">
            {displayedMovies.map((recommendedMovie) => (
              <button
                key={recommendedMovie.id || recommendedMovie._id}
                type="button"
                onClick={() => handleMovieClick(recommendedMovie.id || recommendedMovie._id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left group"
              >
                <div className="flex-shrink-0 w-auto h-24 aspect-[2/3] object-cover rounded-md overflow-hidden bg-bgColor4">
                  {recommendedMovie.poster && (
                    <OptimizedImage
                      src={recommendedMovie.poster}
                      alt={recommendedMovie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      priority={false}
                      lazy={true}
                      preloadOnHover={false}
                      sizeKey="THUMBNAIL"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-primaryColor transition-colors">
                    {recommendedMovie.title}
                  </p>
                  {recommendedMovie.englishTitle && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {recommendedMovie.englishTitle}
                    </p>
                  )}
                  <div className="mt-1.5">
                    <MovieViewsTag movie={recommendedMovie} compact variant="soft" />
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                    {recommendedMovie.ageRating && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-white/10 text-[10px] font-semibold text-amber-300">
                        {recommendedMovie.ageRating}
                      </span>
                    )}
                    {recommendedMovie.year && (
                      <span className="before:content-['•'] before:mx-1 before:text-gray-500">
                        {recommendedMovie.year}
                      </span>
                    )}
                    {recommendedMovie.duration && (
                      <span className="before:content-['•'] before:mx-1 before:text-gray-500">
                        {recommendedMovie.duration}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* Desktop: Luôn hiển thị đầy đủ */}
          <div className="hidden lg:block space-y-2">
            {recommendedMovies.map((recommendedMovie) => (
              <button
                key={recommendedMovie.id || recommendedMovie._id}
                type="button"
                onClick={() => handleMovieClick(recommendedMovie.id || recommendedMovie._id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left group"
              >
                <div className="flex-shrink-0 w-auto h-24 aspect-[2/3] object-cover rounded-md overflow-hidden bg-bgColor4">
                  {recommendedMovie.poster && (
                    <OptimizedImage
                      src={recommendedMovie.poster}
                      alt={recommendedMovie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      priority={false}
                      lazy={true}
                      preloadOnHover={false}
                      sizeKey="THUMBNAIL"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm  font-semibold text-white truncate group-hover:text-primaryColor transition-colors">
                    {recommendedMovie.title}
                  </p>
                  {recommendedMovie.englishTitle && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {recommendedMovie.englishTitle}
                    </p>
                  )}
                  <div className="mt-1.5">
                    <MovieViewsTag movie={recommendedMovie} compact variant="soft" />
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                    {recommendedMovie.ageRating && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-white/10 text-[10px] font-semibold text-amber-300">
                        {recommendedMovie.ageRating}
                      </span>
                    )}
                    {recommendedMovie.year && (
                      <span className="before:content-['•'] before:mx-1 before:text-gray-500">
                        {recommendedMovie.year}
                      </span>
                    )}
                    {recommendedMovie.duration && (
                      <span className="before:content-['•'] before:mx-1 before:text-gray-500">
                        {recommendedMovie.duration}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-400 py-2">Chưa có phim gợi ý</div>
      )}
    </div>
  );
};

export default RecommendationsSection;
