import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GenreTag, BannerBackground, MovieInfo, useBannerConfig } from "../BannerHome/index";

/**
 * Mobile Movie Hero Component - Hero section for mobile movie detail page
 * Reuses GenreTag, MovieInfo, and useBannerConfig from BannerHome for consistency
 * @param {Object} props
 * @param {Object} props.movie - Movie data
 */
const MobileMovieHero = ({ movie }) => {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);

  // Reuse BannerHome's config hook to generate infoBadges
  const { infoBadges } = useBannerConfig(movie);

  const handleWatch = () => {
    navigate(`/watch/${movie.id}?ep=1`);
  };

  const handleComment = () => {
    // Scroll to comments section
    const commentsSection = document.querySelector(".comments-section");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen mt-[60px]">
      {/* Background Image */}
      <BannerBackground
        backgroundImage={movie.bgImage || movie.backdropUrl || movie.poster}
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
          {movie.rating && (
            <div className="absolute -top-2 -right-2 bg-blue-600 text-white px-3 py-2 rounded-full flex items-center gap-1 shadow-lg z-10">
              <i className="fa-solid fa-star text-yellow-400 text-sm" />
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
          className="flex items-center gap-2 text-primaryColor mb-6 hover:text-yellow-300 transition-colors"
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

            {/* Status */}
            {movie.status && (
              <div className="flex items-center gap-2 text-sm">
                <i className="fa-solid fa-circle-check text-green-500" />
                <span className="text-green-400">{movie.status}</span>
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
              {movie.duration && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-medium min-w-[90px]">Thời lượng:</span>
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
          className="w-[85%] max-w-xs bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 rounded-full flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/30 transition-all hover:scale-105 mb-6"
        >
          <i className="fa-solid fa-play text-lg" />
          <span className="text-lg">Xem Ngay</span>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 text-white">
          <button className="flex flex-col items-center gap-2 hover:text-yellow-400 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-heart text-xl" />
            </div>
            <span className="text-xs text-gray-400">Yêu thích</span>
          </button>

          <button className="flex flex-col items-center gap-2 hover:text-yellow-400 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-plus text-xl" />
            </div>
            <span className="text-xs text-gray-400">Thêm vào</span>
          </button>

          <button className="flex flex-col items-center gap-2 hover:text-yellow-400 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-share-nodes text-xl" />
            </div>
            <span className="text-xs text-gray-400">Chia sẻ</span>
          </button>

          <button
            onClick={handleComment}
            className="hidden sm:flex flex-col items-center gap-2 hover:text-yellow-400 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-comment text-xl" />
            </div>
            <span className="text-xs text-gray-400">Bình luận</span>
          </button>

          {/* Rating Button - Star icon only */}
          <button className="flex flex-col items-center gap-2 hover:text-yellow-400 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-star text-xl text-yellow-400" />
            </div>
            <span className="text-xs text-gray-400">Đánh giá</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMovieHero;
