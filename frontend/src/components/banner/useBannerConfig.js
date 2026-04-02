import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import favoritesCache from "utils/favoritesCache";

/**
 * Custom hook to generate banner configuration
 * Handles navigation and toast notifications
 * @param {Object} movieData - Movie data object
 * @param {Function} successToast - Success toast function from parent component
 * @param {Function} warningToast - Warning toast function from parent component
 * @returns {Object} { infoBadges, actionButtons }
 */
export const useBannerConfig = (movieData, successToast, warningToast) => {
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const hasFetchedRef = useRef(false);

  // Fetch favorites list when authenticated (with cache)
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !movieData?.id) {
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

        setIsFavorite(favoriteIds.includes(movieData.id));
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
        setIsFavorite(cached.includes(movieData.id));
      }
    }
  }, [isAuthenticated, user?.id, movieData?.id]);

  // Info badges configuration
  const infoBadges = useMemo(
    () => [
      {
        label: "⭐",
        value: movieData.rating ? movieData.rating.toFixed(1) : "Chưa có",
        isRating: true,
      },
      { label: movieData.ageRating },
      { label: movieData.year },
      { label: movieData.duration },
      { label: movieData.quality },
      { label: movieData.country },
      ...(movieData.totalEpisodes > 1 && movieData.currentEpisode
        ? [{ label: `Tập ${movieData.currentEpisode}` }]
        : []),
    ],
    [movieData]
  );

  // Handle add/remove from favorites
  const handleToggleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    try {
      if (isFavorite) {
        await userService.removeFromFavorites(movieData.id);
        setIsFavorite(false);
        // Clear cache to force refresh on next fetch
        favoritesCache.clear();
        if (successToast) successToast("Đã xóa khỏi danh sách yêu thích!");
      } else {
        await userService.addToFavorites(movieData.id);
        setIsFavorite(true);
        // Clear cache to force refresh on next fetch
        favoritesCache.clear();
        if (successToast) successToast("Đã thêm vào danh sách yêu thích!");
      }
    } catch (error) {
      if (warningToast) {
        warningToast(error.message || "Không thể cập nhật yêu thích. Vui lòng thử lại!");
      }
      console.error("Error toggling favorite:", error);
    }
  }, [
    isAuthenticated,
    isFavorite,
    movieData.id,
    openAuthModal,
    successToast,
    warningToast,
  ]);

  // Action buttons configuration
  const actionButtons = useMemo(
    () => [
      {
        icon: movieData.isHidden || !movieData.currentEpisode || movieData.currentEpisode === 0 ? "fa-film" : "fa-play",
        variant: "primary",
        size: "lg",
        onClick: () => {
          // Always navigate to watch page, even for hidden movies
          navigate(`/watch/${movieData.id}?ep=1`);
        },
        ariaLabel: movieData.isHidden || !movieData.currentEpisode || movieData.currentEpisode === 0 ? "Watch trailer" : "Play movie",
        label: movieData.isHidden || !movieData.currentEpisode || movieData.currentEpisode === 0 ? "Xem Trailer" : "Xem Ngay",
      },
      {
        icon: isFavorite ? "fa-heart" : "fa-heart",
        variant: isFavorite ? "favorite" : "default",
        size: "md",
        onClick: handleToggleFavorite,
        ariaLabel: isFavorite ? "Remove from favorites" : "Add to favorites",
        isFavorite: isFavorite,
      },
      {
        icon: "fa-circle-info",
        variant: "default",
        size: "md",
        onClick: () => navigate(`/movie/${movieData.id}`),
        ariaLabel: "Movie details",
      },
    ],
    [
      movieData.id,
      movieData.isHidden,
      movieData.currentEpisode,
      handleToggleFavorite,
      navigate,
      isFavorite,
    ]
  );

  return { infoBadges, actionButtons };
};
