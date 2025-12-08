import React from "react";
import MobileMovieBanner from "components/movie-detail/MobileMovieBanner";
import MovieDetailContent from "components/movie-detail/MovieDetailContent";
import { useNavigate } from "react-router-dom";

/**
 * Mobile layout for movie detail page
 * Vertical stacked layout
 */
const MobileLayout = ({ movie, activeTab, setActiveTab, audioType, onAudioTypeChange }) => {
  const navigate = useNavigate();

  const handlePartChange = (partLabel) => {
    if (!movie?.seriesParts || !Array.isArray(movie.seriesParts)) return;

    const match = partLabel.match(/Phần\s*(\d+)/i);
    const partNumber = match ? parseInt(match[1], 10) : 1;
    const target = movie.seriesParts.find((p) => p.partNumber === partNumber);
    if (!target) return;

    navigate(`/movie/${target.id}`);
  };
  return (
    <div className="lg:hidden">
      {/* Hero Section */}
      <MobileMovieBanner movie={movie} audioType={audioType} />

      {/* Tabs, Content & Comments */}
      <MovieDetailContent
        movie={movie}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        audioType={audioType}
        onAudioTypeChange={onAudioTypeChange}
        commentsSectionClass="comments-section-mobile"
        onPartChange={handlePartChange}
      />
    </div>
  );
};

export default MobileLayout;
