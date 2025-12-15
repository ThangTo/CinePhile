import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import movieService from "services/movie.service";
import OptimizedImage from "components/common/OptimizedImage";
import { BarSpinner } from "components/common/LoadingState";

const RecommendationsSection = ({ movie }) => {
  const navigate = useNavigate();
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!movie) {
        console.log("[Recommendations] No movie provided");
        setLoading(false);
        return;
      }

      console.log("[Recommendations] Fetching recommendations for movie:", movie.id || movie._id, movie.title);
      setLoading(true);
      setError(null);

      try {
        const movieId = movie.id || movie._id;
        console.log("[Recommendations] Calling API with movieId:", movieId);
        const response = await movieService.getRecommendations(movieId, 10);
        console.log("[Recommendations] API Response:", response);
        const movies = response?.data || [];
        console.log("[Recommendations] Movies received:", movies.length, movies);
        setRecommendedMovies(movies);
      } catch (err) {
        console.error("[Recommendations] Error fetching recommendations:", err);
        console.error("[Recommendations] Error details:", err.message, err.response);
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
    console.log("[Recommendations] Component rendered but no movie prop");
    return null;
  }

  console.log("[Recommendations] Render state:", { 
    loading, 
    error, 
    moviesCount: recommendedMovies.length,
    movieId: movie.id || movie._id 
  });

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
        <div className="text-sm text-gray-400 py-2">
          {error || "Chưa có phim gợi ý"}
        </div>
        {error && (
          <div className="text-xs text-red-400 mt-1">
            Debug: {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Phim gợi ý</h3>
      
      {recommendedMovies.length > 0 ? (
        <div className="space-y-2">
          {recommendedMovies.map((recommendedMovie) => (
            <button
              key={recommendedMovie.id || recommendedMovie._id}
              type="button"
              onClick={() => handleMovieClick(recommendedMovie.id || recommendedMovie._id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left group"
            >
              <div className="flex-shrink-0 w-10 h-14 rounded-md overflow-hidden bg-bgColor4">
                {recommendedMovie.poster && (
                  <OptimizedImage
                    src={recommendedMovie.poster}
                    alt={recommendedMovie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    priority={false}
                    lazy={true}
                    preloadOnHover={false}
                    size="40"
                    quality="100"
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
      ) : (
        <div className="text-sm text-gray-400 py-2">
          Chưa có phim gợi ý
        </div>
      )}
    </div>
  );
};

export default RecommendationsSection;
