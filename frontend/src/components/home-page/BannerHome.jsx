import React, { useState, useEffect } from "react";
import { BannerContent, BannerBackground, useBannerConfig } from "components/banner/index";
import movieService from "services/movie.service";

/**
 * Banner Home Component - Main hero banner for homepage
 * @param {Object} props
 * @param {Object} props.movie - Movie data (optional, fetches trending if not provided)
 */
const BannerHome = ({ movie }) => {
  const [movieData, setMovieData] = useState(movie || null);
  const [loading, setLoading] = useState(!movie);

  useEffect(() => {
    // If no movie prop provided, fetch trending movie
    if (!movie) {
      const fetchBannerMovie = async () => {
        try {
          setLoading(true);
          const response = await movieService.getTrending(1);
          if (response.data && response.data.length > 0) {
            setMovieData(response.data[0]);
          }
        } catch (error) {
          console.error("Error fetching banner movie:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchBannerMovie();
    } else {
      setMovieData(movie);
      setLoading(false);
    }
  }, [movie]);

  // Generate configuration using custom hook - MUST be called before any early returns
  // Use fallback empty object to ensure hooks are always called
  const { infoBadges, actionButtons } = useBannerConfig(movieData || {});

  // Show loading state if no movie data
  if (loading || !movieData) {
    return (
      <section className="relative w-full overflow-hidden z-0 mt-[60px] md:mt-0 h-[400px] md:h-[600px] flex items-center justify-center">
        <div className="text-white">Đang tải...</div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden z-0 mt-[60px] md:mt-0">
      {/* Background with gradients */}
      <BannerBackground backgroundImage={movieData.backgroundImage} title={movieData.title} />

      {/* Main content */}
      <BannerContent movieData={movieData} infoBadges={infoBadges} actionButtons={actionButtons} />
    </section>
  );
};

export default BannerHome;
