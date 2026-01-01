import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useToast from "hooks/useToast";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import ToastContainer from "components/common/ToastContainer";
import { preloadImage } from "utils/imagePreloader";
import favoritesCache from "utils/favoritesCache";
import { getOptimizedImageUrl } from "constants/imageSizes";
import HoverCardHeader from "./HoverCardHeader";
import HoverCardActions from "./HoverCardActions";
import HoverCardInfo from "./HoverCardInfo";
import HoverCardGenres from "./HoverCardGenres";

/**
 * Movie Hover Card Component - Detailed movie information on hover
 * Reuses components from BannerHome for consistency
 * @param {Object} props
 * @param {Object} props.movie - Movie data
 */
const MovieHoverCard = ({ movie, hoverClass = "w-[400px]", compact = false }) => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, warning } = useToast();
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const hasFetchedRef = useRef(false);

  // Preload detail page images when hover card is shown
  useEffect(() => {
    if (!movie) return;

    // Preload background and poster for detail page using standardized sizes
    const bgImage = movie.bgImage || movie.backgroundImage || movie.poster;
    if (bgImage) {
      const optimizedBg = getOptimizedImageUrl(bgImage, "BANNER");
      if (optimizedBg) preloadImage(optimizedBg).catch(() => {});
    }
    if (movie.poster) {
      const optimizedPoster = getOptimizedImageUrl(movie.poster, "DETAIL");
      if (optimizedPoster) preloadImage(optimizedPoster).catch(() => {});
    }
  }, [movie]);

  // Fetch favorites list when authenticated (with cache)
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !movie?.id) {
      setIsFavorite(false);
      return;
    }

    // Use cache to avoid repeated API calls
    const fetchFavorites = async () => {
      try {
        const favoriteIds = await favoritesCache.getOrFetch(async () => {
          const response = await userService.getFavorites({ limit: 1000 });
          const favorites = response?.data || [];
          return favorites.map(
            (fav) => fav.movieId?._id || fav.movieId?.id || fav.movieId || fav._id
          );
        });

        setIsFavorite(favoriteIds.includes(movie.id));
      } catch (error) {
        console.error("Error fetching favorites:", error);
        setIsFavorite(false);
      }
    };

    // Only fetch once per component mount
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchFavorites();
    } else {
      // If already fetched, check cache
      const cached = favoritesCache.get();
      if (cached) {
        setIsFavorite(cached.includes(movie.id));
      }
    }
  }, [isAuthenticated, user?.id, movie?.id]);

  // Handler functions
  const handleWatch = (e) => {
    e.stopPropagation();
    navigate(`/watch/${movie.id}?ep=1`);
  };

  const handleToggleFavorite = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    try {
      if (isFavorite) {
        await userService.removeFromFavorites(movie.id);
        setIsFavorite(false);
        // Clear cache to force refresh on next fetch
        favoritesCache.clear();
        success("Đã xóa khỏi danh sách yêu thích!");
      } else {
        await userService.addToFavorites(movie.id);
        setIsFavorite(true);
        // Clear cache to force refresh on next fetch
        favoritesCache.clear();
        success("Đã thêm vào danh sách yêu thích!");
      }
    } catch (error) {
      warning(error.message || "Không thể cập nhật yêu thích. Vui lòng thử lại!");
      console.error("Error toggling favorite:", error);
    }
  };

  const handleInfo = (e) => {
    e.stopPropagation();
    navigate(`/movie/${movie.id}`);
  };

  const handleHeaderClick = (e) => {
    e.stopPropagation();
    navigate(`/movie/${movie.id}`);
  };

  return (
    <>
      <div
        className={`${hoverClass} h-full pb-2 rounded-xl overflow-hidden bg-gray-800 shadow-2xl`}
      >
        {/* Header with backdrop and title */}
        <HoverCardHeader
          backgroundImage={movie.backgroundImage || movie.posterUrl || movie.poster}
          title={movie.title}
          subtitle={movie.subtitle || movie.englishTitle}
          compact={compact}
          onClick={handleHeaderClick}
        />

        {/* Content */}
        <div className={`${compact ? "p-3 space-y-2" : "p-4 space-y-3"}`}>
          {/* Action Buttons */}
          <HoverCardActions
            onWatch={handleWatch}
            onLike={handleToggleFavorite}
            onInfo={handleInfo}
            compact={compact}
            isFavorite={isFavorite}
          />

          {/* Movie Info Badges */}
          <HoverCardInfo
            rating={movie.rating}
            ageRating={movie.ageRating}
            year={movie.year}
            season={movie.season}
            currentEpisode={movie.currentEpisode}
            totalEpisodes={movie.totalEpisodes}
          />

          {/* Genres */}
          <HoverCardGenres genres={movie.genres} />
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default MovieHoverCard;
