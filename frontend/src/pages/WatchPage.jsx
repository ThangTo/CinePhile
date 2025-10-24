import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import SiteFooter from "../components/SiteFooter";
import VideoPlayer from "../components/watch/VideoPlayer";
import ActionBar from "../components/watch/ActionBar";
import RatingSidebar from "../components/watch/RatingSidebar";
import EpisodesSection from "../components/movie-detail/EpisodesSection";
import CommentsSection from "../components/movie-detail/CommentsSection";
import CastSection from "../components/movie-detail/CastSection";
import MovieInfoBrief from "../components/watch/MovieInfoBrief";
import { fetchMovieById, fetchEpisodes } from "../services/api";

const WatchPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const episodeParam = parseInt(searchParams.get("ep") || "1", 10);

  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [activeEp, setActiveEp] = useState(episodeParam);
  const [loading, setLoading] = useState(true);
  const [audioType, setAudioType] = useState("subtitle");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [m, eps] = await Promise.all([fetchMovieById(id), fetchEpisodes(id)]);
        setMovie(m);
        setEpisodes(eps);
      } catch (error) {
        console.error("Error loading movie:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    setActiveEp(episodeParam);
  }, [episodeParam]);

  const handleEpisodeChange = (episodeId) => {
    navigate(`/watch/${id}?ep=${episodeId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        <div className="text-xl">Không tìm thấy phim</div>
      </div>
    );
  }

  const currentEpisode = episodes.find((ep) => ep.id === activeEp) || episodes[0];

  return (
    <div className="min-h-screen">
      <Header />

      {/* Top Bar */}
      <div className="w-full pt-16 pl-6">
        <div className="container mx-auto flex items-center gap-3 px-4 text-white">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <i className="fa-solid fa-chevron-left text-lg" />
          </button>
          <h1 className="text-lg font-semibold">
            Xem phim <span className="text-primaryColor">{movie.title}</span>
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-3">
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12">
            {/* Video Player */}
            <VideoPlayer
              movie={movie}
              episode={currentEpisode}
              onEpisodeChange={handleEpisodeChange}
              totalEpisodes={episodes.length}
              audioType={audioType}
              onAudioTypeChange={setAudioType}
            />

            {/* Action Bar */}
            <ActionBar />
          </div>

          <div className="lg:col-span-8 flex flex-col">
            <MovieInfoBrief movie={movie} activeEp={activeEp} />
            <EpisodesSection
              movie={{ ...movie, episodes }}
              activeEpisode={activeEp}
              onEpisodeClick={handleEpisodeChange}
              audioType={audioType}
              onAudioTypeChange={setAudioType}
            />
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 pl-[24px] border-l-2 border-borderColor">
            <div className="gap-8 flex flex-col">
              <RatingSidebar movie={movie} />
              <CastSection movie={movie} layout="vertical" />
            </div>
          </div>
        </div>
      </div>
      <CommentsSection movie={movie} />
      <SiteFooter />
    </div>
  );
};

export default WatchPage;
