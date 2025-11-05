import React from "react";
import { useParams } from "react-router-dom";
import Header from "components/header";
import SiteFooter from "components/home-page/SiteFooter";
import { MobileLayout, DesktopLayout } from "components/movie-detail/index";
import LoadingState from "components/common/LoadingState";
import ErrorState from "components/common/ErrorState";
import useMovieDetail from "hooks/useMovieDetail";

const MovieDetail = () => {
  const { id } = useParams();
  const { movie, loading, error, activeTab, setActiveTab, audioType, setAudioType } =
    useMovieDetail(id);

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Error state
  if (error || !movie) {
    return <ErrorState message={error || "Không tìm thấy phim"} />;
  }

  // Shared props for both layouts
  const layoutProps = {
    movie,
    activeTab,
    setActiveTab,
    audioType,
    onAudioTypeChange: setAudioType,
  };

  return (
    <div className="min-h-screen bg-bgColor overflow-x-hidden">
      <Header />

      {/* Mobile Layout */}
      <MobileLayout {...layoutProps} />

      {/* Desktop Layout */}
      <DesktopLayout {...layoutProps} />

      <SiteFooter />
    </div>
  );
};

export default MovieDetail;
