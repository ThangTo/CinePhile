import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// --- CÁC IMPORT COMPONENT (Đã sửa lại đường dẫn chuẩn) ---
import VideoPlayer from "../components/watch-page/VideoPlayer";
import ActionBar from "../components/watch-page/ActionBar";
import RatingSidebar from "../components/watch-page/RatingSidebar";
import MovieInfoBrief from "../components/watch-page/MovieInfoBrief";

import EpisodesSection from "../components/movie-detail/EpisodesSection";
import CommentsSection from "../components/movie-detail/CommentsSection";
import CastSection from "../components/movie-detail/CastSection";

// Service
import movieService from "../services/movie.service";

const WatchPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Slug phim
  const [searchParams] = useSearchParams();

  // Lấy tập từ URL (?ep=tap-01). Nếu không có thì mặc định null
  const episodeParam = searchParams.get("ep");

  // State
  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [cast, setCast] = useState([]);

  // Lưu ID của tập đang xem để active
  const [activeEpId, setActiveEpId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [audioType, setAudioType] = useState("subtitle");

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // GỌI 3 API SONG SONG (Chuẩn database mới)
        const [movieRes, epRes, castRes] = await Promise.all([
          movieService.getById(id),
          movieService.getEpisodes(id),
          movieService.getCast(id),
        ]);

        // 1. Xử lý dữ liệu Phim
        // Backend trả về { status: "success", data: ... } hoặc trực tiếp data tùy config axios
        const movieData = movieRes.data?.data || movieRes.data || movieRes;
        setMovie(movieData);

        // 2. Xử lý dữ liệu Tập phim
        const epList = epRes.data?.data || epRes.data || [];
        const safeEpList = Array.isArray(epList) ? epList : [];
        setEpisodes(safeEpList);

        // 3. Xử lý dữ liệu Diễn viên
        const castList = castRes.data?.data || castRes.data || [];
        setCast(Array.isArray(castList) ? castList : []);

        // 4. Xác định tập đang xem
        if (safeEpList.length > 0) {
          // Tìm tập trùng với param trên URL (so sánh slug hoặc tên tập)
          const foundEp = episodeParam
            ? safeEpList.find((e) => e.slug === episodeParam || e.episode === episodeParam)
            : safeEpList[0];

          // Set ID để active
          setActiveEpId(foundEp?._id || safeEpList[0]._id);
        }
      } catch (error) {
        console.error("Error loading movie data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, episodeParam]);

  const handleEpisodeChange = (episode) => {
    // Xử lý khi bấm vào tập phim
    // episode có thể là object hoặc id tùy component con trả về, ta xử lý an toàn:
    const epSlug = episode.slug || episode.episode;
    const epId = episode._id || episode.id;

    navigate(`/watch/${id}?ep=${epSlug}`);
    setActiveEpId(epId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bgColor text-white flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-bgColor text-white flex items-center justify-center">
        <div className="text-xl">Không tìm thấy phim</div>
      </div>
    );
  }

  // Tìm object tập phim hiện tại để đưa vào Player
  const currentEpisode = episodes.find((ep) => ep._id === activeEpId) || episodes[0];

  return (
    <div className="min-h-screen bg-bgColor">
      {/* Top Bar */}
      <div className="w-full pt-16 md:pt-20 px-4">
        <div className="container mx-auto flex items-center gap-3 text-white">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6" />
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
              src={currentEpisode?.videoUrl}
              poster={movie.backgroundImage || movie.poster}
              // Giữ lại props cũ phòng khi bạn muốn dùng lại logic cũ
              movie={movie}
              episode={currentEpisode}
            />

            {/* Action Bar - Only favorite and add buttons */}
            <ActionBar movie={movie} />
          </div>

          {/* Desktop Layout: Left column (Movie Info + Episodes + Comments) */}
          <div className="lg:col-span-8 flex flex-col">
            {/* Movie Info Brief - Hidden on md and below */}
            <div className="hidden lg:block">
              <MovieInfoBrief movie={movie} activeEp={currentEpisode} />
            </div>

            {/* Episodes Section */}
            <EpisodesSection
              movie={{ ...movie, episodes }} // Fallback cho code cũ
              episodes={episodes} // Prop mới: danh sách tập
              activeEpisode={activeEpId} // Prop mới: ID tập đang xem
              activeEpisodeId={activeEpId} // Prop dự phòng (tùy tên prop bên trong component con)
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

              {/* Truyền cast xuống CastSection */}
              <CastSection movie={movie} cast={cast} layout="vertical" />
            </div>
          </div>

          {/* Mobile/Tablet Layout: Rating + Cast below Episodes (sm and below) */}
          <div className="lg:hidden w-full space-y-6 mt-6">
            <RatingSidebar movie={movie} />
            <CastSection movie={movie} layout="vertical" />
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
