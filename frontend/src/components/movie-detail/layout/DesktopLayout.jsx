import React from "react";
import ActionButtons from "components/movie-detail/ActionButtons";
import SidebarInfo from "components/movie-detail/SidebarInfo";
import MovieDetailContent from "components/movie-detail/MovieDetailContent";
import BannerBackground from "components/banner/BannerBackground";
import { useNavigate } from "react-router-dom";

const DesktopLayout = ({ movie, activeTab, setActiveTab, audioType, onAudioTypeChange }) => {
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
    <div className="hidden lg:block">
      {/* Background Banner */}
      <div className="h-[675px] relative overflow-hidden">
        <BannerBackground
          backgroundImage={movie.bgImage || movie.backgroundImage || movie.poster}
          title={movie.title}
          overlayTop={true}
          classNameOverlay="from-bgColor/70 via-transparent to-transparent"
          className="h-full"
        />
      </div>

      {/* Main Content Layout */}
      <div className="relative container mx-auto px-4 -mt-[200px] z-10">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - 4 columns */}
          <aside className="col-span-4">
            <div className="top-24">
              <SidebarInfo movie={movie} />
            </div>
          </aside>

          {/* Right Content - 8 columns */}
          <main className="col-span-8 space-y-6">
            {/* Action Buttons */}
            <div className="bg-bgColor2/50 backdrop-blur-sm rounded-full overflow-hidden">
              <ActionButtons movie={movie} audioType={audioType} />
            </div>

            {/* Tabs, Content & Comments */}
            <MovieDetailContent
              movie={movie}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              audioType={audioType}
              onAudioTypeChange={onAudioTypeChange}
              commentsSectionClass="comments-section-desktop"
              onPartChange={handlePartChange}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DesktopLayout;
