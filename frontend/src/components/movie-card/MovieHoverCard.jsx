import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useToast from "hooks/useToast";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import ToastContainer from "components/common/ToastContainer";
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

  // Fetch favorites list when authenticated
  useEffect(() => {
    if (isAuthenticated && user && movie?.id) {
      const fetchFavorites = async () => {
        try {
          const response = await userService.getFavorites({ limit: 1000 });
          const favorites = response?.data || [];
          const favoriteIds = favorites.map((fav) => 
            fav.movieId?._id || fav.movieId?.id || fav.movieId || fav._id
          );
          setIsFavorite(favoriteIds.includes(movie.id));
        } catch (error) {
          console.error("Error fetching favorites:", error);
        }
      };
      fetchFavorites();
    } else {
      setIsFavorite(false);
    }
  }, [isAuthenticated, user, movie?.id]);

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
        success("Đã xóa khỏi danh sách yêu thích!");
      } else {
        await userService.addToFavorites(movie.id);
        setIsFavorite(true);
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
      <div className={`${hoverClass} h-full pb-2 rounded-xl overflow-hidden bg-gray-800 shadow-2xl`}>
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
