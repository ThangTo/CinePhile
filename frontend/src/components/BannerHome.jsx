import React from "react";
import BannerBackground from "./BannerHome/BannerBackground";
import BannerContent from "./BannerHome/BannerContent";
import { useBannerConfig } from "./BannerHome/useBannerConfig";
import { defaultBannerMovie } from "../data/mockData";

/**
 * Banner Home Component - Main hero banner for homepage
 * @param {Object} props
 * @param {Object} props.movie - Movie data (optional, uses default from mockData if not provided)
 */
const BannerHome = ({ movie }) => {
  // Use provided movie or default mock data from centralized mockData.js
  const movieData = movie || defaultBannerMovie;

  // Generate configuration using custom hook
  const { infoBadges, actionButtons } = useBannerConfig(movieData);

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
