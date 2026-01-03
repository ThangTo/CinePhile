import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GenreTag, BannerBackground, MovieInfo, useBannerConfig } from "components/banner/index";
import StatusBadge from "./StatusBadge";
import useToast from "hooks/useToast";
import useAuth from "hooks/useAuth";
import useMovieRating from "hooks/useMovieRating";
import ToastContainer from "components/common/ToastContainer";
import RatingModal from "components/watch-page/RatingModal";
import userService from "services/user.service";
import favoritesCache from "utils/favoritesCache";

/**
 * Mobile Movie Hero Component - Hero section for mobile movie detail page
 * Reuses GenreTag, MovieInfo, and useBannerConfig from BannerHome for consistency
 * @param {Object} props
 * @param {Object} props.movie - Movie data
 * @param {string} props.audioType - Audio type for watch navigation
 */
const MobileMovieBanner = ({ movie, audioType }) => {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  const { toasts, removeToast, success, info, warning } = useToast();
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const hasFetchedRef = useRef(false);

  // Reuse BannerHome's config hook to generate infoBadges
  const { infoBadges } = useBannerConfig(movie);

  // Fetch favorites list when authenticated (with cache) - Same logic as desktop
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

  const handleWatch = () => {
    navigate(
      `/watch/${movie.id}?ep=1${audioType ? `&audio=${encodeURIComponent(audioType)}` : ""}`
    );
  };

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
    // Scroll to comments section
    const commentsSection = document.querySelector(".comments-section-mobile");
    if (commentsSection) {
      const elementPosition = commentsSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 100;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative mt-[60px]">
      {/* Background Image */}
      <BannerBackground
        backgroundImage={movie.bgImage || movie.backgroundImage || movie.poster}
        title={movie.title}
        classNameOverlay="from-bgColor via-bgColor/50 to-transparent"
        overlTop={true}
        className="sm:relative"
      />

      {/* Content */}
      <div className="relative -mt-40 sm:-mt-60 md:-mt-[380px] pb-8 px-4 flex flex-col items-center">
        {/* Poster with Rating Badge */}
        <div className="relative w-48 mb-6">
          <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/10">
            <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
          </div>

          {/* Rating Badge - Top Right of Poster */}
          {movie.rating > 0 && (
            <div className="absolute -top-2 -right-2 bg-blue-600 text-white px-3 py-2 rounded-full flex items-center gap-1 shadow-lg z-10">
              <i className="fa-solid fa-star text-primaryColor text-sm" />
              <span className="font-bold text-base">{movie.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white mb-2">{movie.title}</h1>
          <p className="text-gray-400 text-sm">{movie.englishTitle || "Running Man"}</p>
        </div>

        {/* Info Dropdown Trigger */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-2 text-primaryColor mb-6 hover:text-hoverPrimaryColor transition-colors"
        >
          <span className="font-medium">Thông tin phim</span>
          <i
            className={`fa-solid fa-chevron-down text-xs transition-transform ${
              showInfo ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Info Dropdown */}
        {showInfo && (
          <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 space-y-3 animate-slideDown">
            {/* Info Badges - Reuse MovieInfo component with generated badges */}
            <div className="flex flex-wrap items-center gap-2">
              <MovieInfo badges={infoBadges} />
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {movie.genres.map((genre, idx) => (
                  <GenreTag key={idx} genre={genre} className="text-[10px] rounded-md" />
                ))}
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-white font-semibold mb-2">Giới thiệu:</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {movie.description || movie.overview || movie.synopsis}
              </p>
            </div>

            {/* Additional Info */}
            <div className="space-y-2 text-sm">
              {movie.status && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-medium min-w-[90px]">Trạng thái:</span>
                  <StatusBadge
                    status={movie.status}
                    currentEpisode={movie.currentEpisode}
                    totalEpisodes={movie.totalEpisodes}
                    className="text-green-400"
                  />
                </div>
              )}
              {movie.duration && (
                <div className="flex items-start gap-2">
                  <span className=" text-gray-400 font-medium min-w-[90px]">Thời lượng:</span>
                  <span className="text-white">{movie.duration}</span>
                </div>
              )}
              {movie.country && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-medium min-w-[90px]">Quốc gia:</span>
                  <span className="text-white">{movie.country}</span>
                </div>
              )}
              {movie.networks && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-medium min-w-[90px]">Networks:</span>
                  <span className="text-white">{movie.networks}</span>
                </div>
              )}
              {movie.studios && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-medium min-w-[90px]">Sản xuất:</span>
                  <span className="text-white">{movie.studios}</span>
                </div>
              )}
              {movie.director && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-medium min-w-[90px]">Đạo diễn:</span>
                  <span className="text-white">{movie.director}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Watch Now Button */}
        <button
          onClick={handleWatch}
          className="w-[85%] max-w-xs bg-primaryColor hover:bg-hoverPrimaryColor text-primaryColorButtonText font-bold py-4 rounded-full flex items-center justify-center gap-3 shadow-lg transition-all hover:scale-105 mb-6"
        >
          <i className="fa-solid fa-play text-lg" />
          <span className="text-lg">Xem Ngay</span>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 text-white">
          <button
            onClick={handleToggleFavorite}
            className={`flex flex-col items-center gap-2 transition-colors ${
              isFavorite ? "text-red-400" : "text-white"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                isFavorite ? "bg-red-500/20 border-red-400/30" : "bg-white/10 border-white/20"
              }`}
            >
              <i className={`fa-solid fa-heart text-xl ${isFavorite ? "text-red-400" : ""}`} />
            </div>
            <span className="text-xs text-gray-400">Yêu thích</span>
          </button>

          <button
            onClick={handleAddToList}
            className="flex flex-col items-center gap-2 transition-colors text-white"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-plus text-xl" />
            </div>
            <span className="text-xs text-gray-400">Thêm vào</span>
          </button>

          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-2 transition-colors text-white"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-share-nodes text-xl" />
            </div>
            <span className="text-xs text-gray-400">Chia sẻ</span>
          </button>

          <button
            onClick={handleComment}
            className="hidden sm:flex flex-col items-center gap-2 transition-colors text-white"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-comment text-xl" />
            </div>
            <span className="text-xs text-gray-400">Bình luận</span>
          </button>

          {/* Rating Button */}
          <button
            onClick={openRatingModal}
            className="flex flex-col items-center gap-2 transition-colors text-white"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-star text-xl text-primaryColor" />
            </div>
            <span className="text-xs text-gray-400">Đánh giá</span>
          </button>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <RatingModal
        isOpen={isModalOpen}
        onClose={closeRatingModal}
        movie={movie}
        onRate={rateMovieWithHook}
      />
    </div>
  );
};

export default MobileMovieBanner;
