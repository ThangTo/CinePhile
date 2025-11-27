import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "hooks/useAuth";
import userService from "services/user.service";
import { InlineSpinner } from "components/common/LoadingState";
import {
  CONTINUE_WATCHING_MOCK,
  ENABLE_CONTINUE_WATCHING_MOCK,
} from "constants/continueWatchingMock";

/**
 * Continue Watching Component
 * Shows user's recently watched movies with progress
 * Only visible when user is authenticated
 */
const ContinueWatching = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [continueWatchingData, setContinueWatchingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showViewMore, setShowViewMore] = useState(false);
  const shouldUseMockData = isAuthenticated && ENABLE_CONTINUE_WATCHING_MOCK;

  useEffect(() => {
    if (!isAuthenticated) {
      setContinueWatchingData([]);
      setLoading(false);
      return;
    }

    if (shouldUseMockData) {
      setContinueWatchingData(CONTINUE_WATCHING_MOCK);
      setLoading(false);
      return;
    }

    if (!user?.id) {
      setContinueWatchingData([]);
      setLoading(false);
      return;
    }

    const fetchContinueWatching = async () => {
      try {
        setLoading(true);
        const response = await userService.getHistory(user.id, { limit: 6 });
        const historyData = response?.data || [];

        // Filter only movies that have been partially watched (not completed)
        const continueWatching = historyData.filter(
          (item) => item.progress && item.progress < 100 && item.progress > 0
        );

        setContinueWatchingData(continueWatching);
      } catch (error) {
        console.error("Error fetching continue watching data:", error);
        setContinueWatchingData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContinueWatching();
  }, [isAuthenticated, user?.id, shouldUseMockData]);

  const handleMovieClick = (movie) => {
    const targetMovieId = movie.movieId || movie.id;
    if (!targetMovieId) {
      return;
    }

    // Navigate to watch page with the episode where user left off
    const episodeToWatch = movie.lastWatchedEpisode || 1;
    navigate(`/watch/${targetMovieId}?ep=${episodeToWatch}`);
  };

  const handleViewMoreClick = () => {
    navigate("/account/continue-watching");
  };

  // Don't render if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Don't render if no continue watching data
  if (!loading && continueWatchingData.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className="w-full py-2 sm:py-6 overflow-visible">
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Xem tiếp của bạn</h2>
          </div>
        </div>
        <InlineSpinner className="py-4" />
      </section>
    );
  }

  return (
    <section className="w-full py-2 sm:py-6 overflow-visible">
      <div className="px-4">
        <div className="flex items-center justify-start gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Xem tiếp của bạn</h2>

          {/* View More Button with Hover Effect */}
          <button
            onClick={handleViewMoreClick}
            onMouseEnter={() => setShowViewMore(true)}
            onMouseLeave={() => setShowViewMore(false)}
            className="flex items-center gap-2 text-gray-400 hover:text-primaryColor transition-all duration-200 px-3 py-1 rounded-full border border-transparent hover:border-primaryColor/60"
            aria-label="Xem thêm phim đã xem"
          >
            {showViewMore ? (
              <>
                <span className="text-sm font-medium">Xem thêm</span>
                <i className="fa-solid fa-chevron-right text-xs" />
              </>
            ) : (
              <span className="inline-flex items-center justify-center w-6 h-6 border border-primaryColor/60 rounded-full">
                <i className="fa-solid fa-chevron-right text-xs text-primaryColor" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Movies List */}
      <div className="px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
          {continueWatchingData.map((item) => {
            const title = item.title || item.movie?.title;
            const engTitle = item.englishTitle || item.movie?.englishTitle;
            const duration = item.durationMinutes || item.movie?.durationMinutes || 69;
            const progressMinutes = Math.round(((item.progress || 0) / 100) * duration);
            return (
              <div
                key={`${item.movieId || item.id}-${item.lastWatchedEpisode || 0}`}
                className="bg-[#10121b] rounded-2xl p-3 shadow-lg border border-white/5 cursor-pointer hover:border-primaryColor/60 hover:opacity-60 transition-all duration-300"
                onClick={() => handleMovieClick(item)}
              >
                <div className="relative rounded-2xl overflow-hidden">
                  <img
                    src={item.poster}
                    alt={title}
                    className="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
                    <i className="fa-solid fa-xmark" />
                  </div>
                  <div className="absolute bottom-0 left-4 right-4 h-1.5 bg-white/15 rounded-full">
                    <div
                      className="h-full bg-primaryColor rounded-full"
                      style={{ width: `${Math.min(Math.max(item.progress || 0, 0), 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-1">
                    Tập {item.lastWatchedEpisode || 1} · {progressMinutes}m / {duration}m
                  </p>
                  <h3 className="text-white text-sm font-semibold">{title}</h3>
                  {engTitle && <p className="text-gray-400 text-xs">{engTitle}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContinueWatching;
