import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import movieService from "services/movie.service";
import SectionHeader from "components/common/SectionHeader";
import { BarSpinner } from "components/common/LoadingState";
import { FiTrendingUp, FiChevronLeft, FiChevronRight, FiPlay, FiStar } from "react-icons/fi";

/**
 * TrendingCarousel - AI-curated trending movies from TMDB + Google Trends + LLM
 * Glassmorphism design with auto-scrolling and AI-generated quotes
 */
const TrendingCarousel = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);
  const autoScrollRef = useRef(null);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true);
        const response = await movieService.getTrendingSocial();
        setMovies(response?.data || []);
      } catch (err) {
        console.error("Error fetching trending social:", err);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (movies.length <= 1) return;

    autoScrollRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % movies.length);
    }, 5000);

    return () => clearInterval(autoScrollRef.current);
  }, [movies.length]);

  // Scroll to active card horizontally only (prevent vertical page jump)
  useEffect(() => {
    if (!scrollRef.current || movies.length === 0) return;
    const container = scrollRef.current;
    const cards = container.querySelectorAll("[data-trending-card]");
    const card = cards[activeIndex];
    
    if (card) {
      const containerWidth = container.offsetWidth;
      const cardWidth = card.offsetWidth;
      const cardOffsetLeft = card.offsetLeft;
      
      // Calculate scroll position to center the card
      const targetScrollLeft = cardOffsetLeft - (containerWidth / 2) + (cardWidth / 2);
      
      container.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth",
      });
    }
  }, [activeIndex, movies.length]);

  const scrollTo = (direction) => {
    clearInterval(autoScrollRef.current);
    setActiveIndex((prev) => {
      if (direction === "left") return prev === 0 ? movies.length - 1 : prev - 1;
      return (prev + 1) % movies.length;
    });
  };

  if (loading) {
    return (
      <section className="w-full py-4 sm:py-8">
        <SectionHeader
          title="🔥 Phim Đang Viral"
          subtitle="AI phân tích xu hướng từ TMDB & Google Trends VN"
          className="px-6"
        />
        <div className="flex justify-center py-8">
          <BarSpinner />
        </div>
      </section>
    );
  }

  if (movies.length === 0) return null;

  return (
    <section className="w-full py-4 sm:py-8">
      <SectionHeader
        title="🔥 Phim Đang Viral"
        subtitle="AI phân tích xu hướng từ TMDB & Google Trends VN"
        className="px-6"
      />

      <div className="relative px-4 sm:px-6 mt-4">
        {/* Navigation Arrows */}
        {movies.length > 1 && (
          <>
            <button
              onClick={() => scrollTo("left")}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-primaryColor/40 hover:border-primaryColor/50 transition-all shadow-lg"
              aria-label="Previous"
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={() => scrollTo("right")}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-primaryColor/40 hover:border-primaryColor/50 transition-all shadow-lg"
              aria-label="Next"
            >
              <FiChevronRight size={20} />
            </button>
          </>
        )}

        {/* Cards Container */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory py-4 md:pb-9 pb-4 px-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {movies.map((movie, idx) => (
            <TrendingCard
              key={movie._id || movie.movieId || idx}
              movie={movie}
              rank={idx + 1}
              isActive={idx === activeIndex}
            />
          ))}
        </div>

        {/* Dot Indicators */}
        {movies.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {movies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  clearInterval(autoScrollRef.current);
                  setActiveIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeIndex
                    ? "w-8 bg-primaryColor shadow-lg shadow-primaryColor/40"
                    : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Individual Trending Card with Glassmorphism overlay
 */
const TrendingCard = ({ movie, rank, isActive }) => {
  const bgImage = movie.thumb_url || movie.poster_url;

  return (
    <Link
      to={`/movie/${movie.slug}`}
      data-trending-card
      className={`relative flex-shrink-0 w-[85vw] sm:w-[420px] lg:w-[480px] h-[240px] sm:h-[280px] rounded-2xl overflow-hidden snap-center group cursor-pointer transition-all duration-500 ${
        isActive
          ? "scale-100 opacity-100 ring-2 ring-primaryColor/50 shadow-lg md:shadow-xl shadow-primaryColor/20"
          : "scale-[0.95] opacity-70 hover:opacity-90"
      }`}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={bgImage}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      {/* Rank Badge (Top-Left) */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5">
          <FiTrendingUp className="text-primaryColor" size={14} />
          <span className="text-white font-black text-sm">#{rank}</span>
        </div>
      </div>

      {/* Trend Score Badge (Top-Right) */}
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center gap-1 bg-primaryColor/20 backdrop-blur-md border border-primaryColor/30 rounded-lg px-2.5 py-1.5">
          <FiStar className="text-primaryColor" size={12} />
          <span className="text-primaryColor font-bold text-xs">{movie.trend_score}/10</span>
        </div>
      </div>

      {/* Play Button (Center) */}
      {/* <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-14 h-14 rounded-full bg-primaryColor/80 backdrop-blur-md flex items-center justify-center shadow-xl shadow-primaryColor/30 transform group-hover:scale-110 transition-transform">
          <FiPlay className="text-black fill-current" size={24} />
        </div>
      </div> */}

      {/* Content (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
        {/* AI Quote - The star of the show */}
        {movie.ai_quote && (
          <div className="mb-3">
            <p className="text-white/90 text-sm sm:text-base font-medium italic leading-relaxed line-clamp-2 drop-shadow-lg">
              "{movie.ai_quote}"
            </p>
          </div>
        )}

        {/* Movie Title */}
        <h3 className="text-white font-bold text-base sm:text-lg truncate group-hover:text-primaryColor transition-colors drop-shadow-md">
          {movie.title}
        </h3>

        {/* Original Title (if different) */}
        {movie.original_title && movie.original_title !== movie.title && (
          <p className="text-white/50 text-xs mt-0.5 truncate">{movie.original_title}</p>
        )}

        {/* Source Tag */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              movie.source === "both"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : movie.source === "google"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {movie.source === "both"
              ? "🔥 TMDB + Google"
              : movie.source === "google"
              ? "Google Trends"
              : "TMDB VN"}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default TrendingCarousel;
