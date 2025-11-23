import React from "react";
import MobileMovieBanner from "components/movie-detail/MobileMovieBanner";
import MovieDetailContent from "components/movie-detail/MovieDetailContent";

/**
 * Mobile layout for movie detail page
 * Vertical stacked layout
 */
const MobileLayout = ({ movie, activeTab, setActiveTab, audioType, onAudioTypeChange }) => {
  return (
    <div className="lg:hidden">
      {/* Hero Section */}
      <MobileMovieBanner movie={movie} />

      {/* Tabs, Content & Comments */}
      <MovieDetailContent
        movie={movie}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        audioType={audioType}
        onAudioTypeChange={onAudioTypeChange}
        commentsSectionClass="comments-section-mobile"
      />
    </div>
  );
};

export default MobileLayout;
