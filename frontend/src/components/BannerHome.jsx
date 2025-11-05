import React, { useState, useEffect } from "react";
import BannerBackground from "./BannerHome/BannerBackground";
import BannerContent from "./BannerHome/BannerContent";
import { useBannerConfig } from "./BannerHome/useBannerConfig";
import movieService from "../services/movie.service";
import { defaultBannerMovie } from "../mocks/mockData";

/**
 * Banner Home Component - Main hero banner for homepage
 * @param {Object} props
 * @param {Object} props.movie - Movie data (optional, fetches trending if not provided)
 */
const BannerHome = ({ movie }) => {
  const [movieData, setMovieData] = useState(movie || defaultBannerMovie || null);

  useEffect(() => {
    // If no movie prop provided, fetch trending movie
    if (!movie) {
      const fetchBannerMovie = async () => {
        try {
          const response = await movieService.getTrending(1);
          if (response.data && response.data.length > 0) {
            setMovieData(response.data[0]);
          } else {
            // Fallback to default mock data
            setMovieData(defaultBannerMovie);
          }
        } catch (error) {
          console.error("Error fetching banner movie:", error);
          // Fallback to default mock data on error
          setMovieData(defaultBannerMovie);
        }
      };
      fetchBannerMovie();
    } else {
      setMovieData(movie);
    }
  }, [movie]);

  // Generate configuration using custom hook - MUST be called before any early returns
  // Use fallback movie data to ensure hooks are always called
  const { infoBadges, actionButtons } = useBannerConfig(movieData || defaultBannerMovie);

  // Show loading state if no movie data
  if (!movieData) {
    return (
      <section className="relative w-full overflow-hidden z-0 mt-[60px] md:mt-0 h-[400px] md:h-[600px] flex items-center justify-center">
        <div className="text-white">Đang tải...</div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden z-0 mt-[60px] md:mt-0">
      {/* Background with gradients */}
      <BannerBackground
        backgroundImage={movieData.backgroundImage || movieData.backdropUrl}
        title={movieData.title}
      />

      {/* Main content */}
      <BannerContent movieData={movieData} infoBadges={infoBadges} actionButtons={actionButtons} />
    </section>
  );
};

export default BannerHome;
