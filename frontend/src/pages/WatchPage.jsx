import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import VideoPlayer from "components/watch-page/VideoPlayer";
import ActionBar from "components/watch-page/ActionBar";
import RatingSidebar from "components/watch-page/RatingSidebar";
import EpisodesSection from "components/movie-detail/EpisodesSection";
import CommentsSection from "components/movie-detail/CommentsSection";
import MovieInfoBrief from "components/watch-page/MovieInfoBrief";
import { fetchMovieById, fetchEpisodes } from "services/movie.service";
import { BarSpinner } from "components/common/LoadingState";

const WatchPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const episodeParam = parseInt(searchParams.get("ep") || "1", 10);
  const audioParam = searchParams.get("audio") || null;

  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [activeEp, setActiveEp] = useState(episodeParam);
  const [loading, setLoading] = useState(true);
  const [audioType, setAudioType] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [m, eps] = await Promise.all([fetchMovieById(id), fetchEpisodes(id)]);
        // Handle response format: could be direct object/array or wrapped in { data }
        setMovie(m?.data || m);
        const episodesData = eps?.data || eps || [];
        const normalizedEpisodes = Array.isArray(episodesData) ? episodesData : [];
        setEpisodes(normalizedEpisodes);

        // Ưu tiên audio từ URL (?audio=), nếu không có thì lấy audioType của tập đầu tiên
        const initialAudio = audioParam || normalizedEpisodes[0]?.audioType || null;
        setAudioType(initialAudio);
      } catch (error) {
        console.error("Error loading movie:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, audioParam]);

  useEffect(() => {
    setActiveEp(episodeParam);
  }, [episodeParam]);

  const handleEpisodeChange = (episodeNumber) => {
    // episodeNumber can be either episode.episode or episode.id (for backward compatibility)
    const audioQuery = audioType ? `&audio=${encodeURIComponent(audioType)}` : "";
    navigate(`/watch/${id}?ep=${episodeNumber}${audioQuery}`);
  };

  // Lọc danh sách tập theo audioType (vietsub / thuyet-minh / long-tieng)
  const filteredEpisodes = useMemo(() => {
    if (!episodes || episodes.length === 0) return [];
    if (!audioType) return episodes;

    const match = episodes.filter((ep) => ep.audioType === audioType);
    if (match.length > 0) return match;

    // Fallback: nếu dữ liệu cũ chưa có audioType, dùng toàn bộ
    return episodes;
  }, [episodes, audioType]);

  if (loading) {
    return <BarSpinner />;
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-bgColor text-white flex items-center justify-center">
        <div className="text-xl">Không tìm thấy phim</div>
      </div>
    );
  }

  // Find episode by episode number (not id)
  // Backend returns: { id: ObjectId, episode: episodeId (number), ... }
  const currentEpisode =
    filteredEpisodes.find((ep) => ep.episode === activeEp || ep.episodeId === activeEp) ||
    filteredEpisodes.find((ep) => (ep.episode || ep.episodeId) === 1) ||
    filteredEpisodes[0];

  return (
    <div className="min-h-screen bg-bgColor">
      {/* Top Bar */}
      <div className="w-full pt-16 md:pt-20 px-4">
        <div className="container mx-auto flex items-center gap-3 text-white">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <i className="fa-solid fa-chevron-left text-lg" />
          </button>
          <h1 className="text-base md:text-lg font-semibold truncate">
            Xem phim <span className="text-primaryColor">{movie.title}</span>
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-3 md:py-6">
        <div className="grid lg:grid-cols-12 gap-4 md:gap-6">
          {/* Video Player - Full width on all screens */}
          <div className="lg:col-span-12 w-full">
            <VideoPlayer
              movie={movie}
              episode={currentEpisode}
              onEpisodeChange={handleEpisodeChange}
              totalEpisodes={filteredEpisodes.length}
              audioType={audioType}
              onAudioTypeChange={setAudioType}
            />

            {/* Action Bar - Only favorite and add buttons */}
            <ActionBar movie={movie} />
          </div>

          {/* Desktop Layout: Left column (Movie Info + Episodes + Comments) */}
          <div className="lg:col-span-8 flex flex-col">
            {/* Movie Info Brief - Hidden on md and below */}
            <div className="hidden lg:block">
              <MovieInfoBrief movie={movie} activeEp={activeEp} />
            </div>

            {/* Episodes Section */}
            <EpisodesSection
              movie={{ ...movie, episodes: filteredEpisodes }}
              activeEpisode={activeEp}
              onEpisodeClick={handleEpisodeChange}
              audioType={audioType}
              onAudioTypeChange={setAudioType}
            />

            {/* Comments - constrained to left grid column on desktop */}
            <div className="hidden lg:block mt-6">
              <CommentsSection movie={movie} />
            </div>
          </div>

          {/* Desktop Layout: Right Sidebar (Rating + Cast) */}
          <div className="hidden lg:block lg:col-span-4 pl-6 border-l-2 border-borderColor">
            <div className="gap-8 flex flex-col">
              <RatingSidebar movie={movie} />
              {/* <CastSection movie={movie} layout="vertical" /> */}
            </div>
          </div>

          {/* Mobile/Tablet Layout: Rating + Cast below Episodes (sm and below) */}
          <div className="lg:hidden w-full space-y-6 mt-6">
            <RatingSidebar movie={movie} />
            {/* <CastSection movie={movie} layout="vertical" /> */}
          </div>

          {/* Mobile/Tablet Comments below rating & cast */}
          <div className="lg:hidden w-full mt-6">
            <CommentsSection movie={movie} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
