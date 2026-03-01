import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useToast from "hooks/useToast";
import useAuth from "hooks/useAuth";
import useMovieRating from "hooks/useMovieRating";
import ToastContainer from "components/common/ToastContainer";
import RatingModal from "components/watch-page/RatingModal";
import userService from "services/user.service";
import favoritesCache from "utils/favoritesCache";

const ActionButtons = ({ movie, audioType }) => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, info, warning } = useToast();
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const hasFetchedRef = useRef(false);

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
  const {
    isModalOpen,
    openRatingModal,
    closeRatingModal,
    rateMovie: rateMovieWithHook,
  } = useMovieRating(movie);

  const handleToggleFavorite = async () => {
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

  const handleAddToList = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    try {
      await userService.addToWatchlist(movie.id);
      success("Đã thêm vào danh sách!");
    } catch (error) {
      warning(error.message || "Không thể thêm vào danh sách. Vui lòng thử lại!");
      console.error("Error adding to watchlist:", error);
    }
  };

  const handleShare = () => {
    info("Chức năng chia sẻ sẽ được tích hợp!");
  };

  const handleComment = () => {
    // Check window size to determine which section to scroll to
    const isDesktop = window.innerWidth >= 1024; // lg breakpoint
    console.log(isDesktop);
    const selector = isDesktop ? ".comments-section-desktop" : ".comments-section-mobile";
    const commentsSection = document.querySelector(selector);

    if (!commentsSection) {
      console.warn(`Comments section (${selector}) not found`);
      return;
    }

    // Get absolute position
    const elementPosition = commentsSection.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - 100;

    // Scroll to position
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-6 py-6 px-4">
        {/* Watch Now / Watch Trailer Button */}
        <div className="flex items-center justify-start gap-6">
          <button
            onClick={() => {
              // Always navigate to watch page, even for hidden movies
              navigate(
                `/watch/${movie.id}?ep=1${
                  audioType ? `&audio=${encodeURIComponent(audioType)}` : ""
                }`
              );
            }}
            className={`${
              movie.isHidden || !movie.currentEpisode || movie.currentEpisode === 0
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-primaryColor hover:bg-hoverPrimaryColor"
            } text-primaryColorButtonText px-8 py-3 rounded-full font-semibold flex items-center gap-2 transition-all shadow-lg`}
          >
            <i className={`fa-solid ${movie.isHidden || !movie.currentEpisode || movie.currentEpisode === 0 ? "fa-film" : "fa-play"} text-lg`} />
            {movie.isHidden || !movie.currentEpisode || movie.currentEpisode === 0 ? "Xem Trailer" : "Xem Ngay"}
          </button>

          {/* Action Buttons */}
          <button
            onClick={handleToggleFavorite}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isFavorite ? "text-red-400 hover:text-red-300" : "text-white hover:text-primaryColor"
            }`}
          >
            <i className={`fa-solid fa-heart text-2xl ${isFavorite ? "text-red-400" : ""}`} />
            <span className="text-xs">Yêu thích</span>
          </button>

          <button
            onClick={handleAddToList}
            className="flex flex-col items-center gap-1 hover:text-primaryColor transition-colors text-white"
          >
            <i className="fa-solid fa-plus text-2xl" />
            <span className="text-xs">Thêm vào</span>
          </button>

          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 hover:text-primaryColor transition-colors text-white"
          >
            <i className="fa-solid fa-paper-plane text-2xl" />
            <span className="text-xs">Chia sẻ</span>
          </button>

          <button
            onClick={handleComment}
            className="flex flex-col items-center gap-1 hover:text-primaryColor transition-colors text-white"
          >
            <i className="fa-solid fa-comment text-2xl" />
            <span className="text-xs">Bình luận</span>
          </button>
        </div>

        <button
          onClick={openRatingModal}
          className="bg-blue-600 hover:bg-blue-700 text-white lg:px-4 px-2 py-2 rounded-full flex items-center gap-2 font-semibold shadow-lg transition-all"
        >
          <i className="fa-solid fa-smile text-lg" />
          <span className="text-base">{parseFloat(movie.rating).toFixed(1)}</span>
          <span className="text-sm">Đánh giá</span>
        </button>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <RatingModal
        isOpen={isModalOpen}
        onClose={closeRatingModal}
        movie={movie}
        onRate={rateMovieWithHook}
      />
    </>
  );
};

export default ActionButtons;
