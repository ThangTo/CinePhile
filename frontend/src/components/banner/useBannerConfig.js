import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";

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
  const [favoritesList, setFavoritesList] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch favorites list when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchFavorites = async () => {
        try {
          const response = await userService.getFavorites({ limit: 1000 });
          const favorites = response?.data || [];
          const favoriteIds = favorites.map((fav) => 
            fav.movieId?._id || fav.movieId?.id || fav.movieId || fav._id
          );
          setFavoritesList(favoriteIds);
          setIsFavorite(favoriteIds.includes(movieData.id));
        } catch (error) {
          console.error("Error fetching favorites:", error);
        }
      };
      fetchFavorites();
    } else {
      setFavoritesList([]);
      setIsFavorite(false);
    }
  }, [isAuthenticated, user, movieData.id]);

  // Info badges configuration
  const infoBadges = useMemo(
    () => [
      { label: "IMDb", value: movieData.imdb, isIMDb: true },
      { label: movieData.ageRating },
      { label: movieData.year },
      { label: movieData.duration },
      { label: movieData.quality },
      { label: movieData.country },
    ],
    [movieData]
  );

  // Handle add/remove from favorites
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    try {
      if (isFavorite) {
        await userService.removeFromFavorites(movieData.id);
        setIsFavorite(false);
        setFavoritesList((prev) => prev.filter((id) => id !== movieData.id));
        if (successToast) successToast("Đã xóa khỏi danh sách yêu thích!");
      } else {
        await userService.addToFavorites(movieData.id);
        setIsFavorite(true);
        setFavoritesList((prev) => [...prev, movieData.id]);
        if (successToast) successToast("Đã thêm vào danh sách yêu thích!");
      }
    } catch (error) {
      if (warningToast) {
        warningToast(error.message || "Không thể cập nhật yêu thích. Vui lòng thử lại!");
      }
      console.error("Error toggling favorite:", error);
    }
  };

  // Action buttons configuration
  const actionButtons = useMemo(
    () => [
      {
        icon: "fa-play",
        variant: "primary",
        size: "lg",
        onClick: () => navigate(`/watch/${movieData.id}?ep=1`),
        ariaLabel: "Play movie",
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
    [movieData.id, navigate, isAuthenticated, isFavorite]
  );

  return { infoBadges, actionButtons };
};
