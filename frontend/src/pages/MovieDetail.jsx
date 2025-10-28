import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import SiteFooter from "../components/SiteFooter";
import BannerBackground from "../components/BannerHome/BannerBackground";
import DetailTabs from "../components/movie-detail/DetailTabs";
import TabContent from "../components/movie-detail/TabContent";
import CommentsSection from "../components/movie-detail/CommentsSection";
import MobileMovieHero from "../components/movie-detail/MobileMovieHero";
import ActionButtons from "../components/movie-detail/ActionButtons";
import SidebarInfo from "../components/movie-detail/SidebarInfo";
import { getMovieDetail } from "../data/mockData";

const MovieDetail = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [activeTab, setActiveTab] = useState("episodes");
  const [loading, setLoading] = useState(true);
  const [audioType, setAudioType] = useState("subtitle");

  useEffect(() => {
    // Fetch movie data from centralized mockData
    const fetchMovie = async () => {
      setLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Get movie data from mockData.js
        const movieData = getMovieDetail(id);

        if (movieData) {
          setMovie(movieData);
        } else {
          console.error(`Movie with ID ${id} not found`);
        }
      } catch (error) {
        console.error("Error fetching movie:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Không tìm thấy phim</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgColor">
      <Header />

      {/* Mobile View */}
      <div className="lg:hidden">
        <MobileMovieHero movie={movie} />
        <DetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabContent
          activeTab={activeTab}
          movie={movie}
          audioType={audioType}
          onAudioTypeChange={setAudioType}
        />
        <CommentsSection movie={movie} />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        {/* Background Banner */}
        <div className="h-[675px] relative overflow-hidden">
          <BannerBackground
            backgroundImage={movie.bgImage || movie.backdropUrl || movie.poster}
            title={movie.title}
            overlayTop={true}
            overlayLeft={true}
            classNameOverlay="from-bgColor/70 via-transparent to-transparent"
            className="h-full"
          />
        </div>

        {/* Main Content Layout */}
        <div className="relative container mx-auto px-4 -mt-[200px] z-10 ">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - 4 columns */}
            <div className="col-span-4">
              <div className="top-24">
                <SidebarInfo movie={movie} />
              </div>
            </div>

            {/* Right Content - 8 columns */}
            <div className="col-span-8 space-y-6 ">
              {/* Action Buttons */}
              <div className="bg-bgColor2/50 backdrop-blur-sm rounded-xl border border-white/10">
                <ActionButtons movie={movie} />
              </div>

              {/* Tabs */}
              <DetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />

              {/* Tab Content */}
              <TabContent
                activeTab={activeTab}
                movie={movie}
                audioType={audioType}
                onAudioTypeChange={setAudioType}
              />

              {/* Comments */}
              <CommentsSection movie={movie} />
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
};

export default MovieDetail;
