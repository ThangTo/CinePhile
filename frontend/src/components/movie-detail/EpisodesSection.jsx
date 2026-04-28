import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import iconPD from "assets/images/icons/pd.svg";
import iconTM from "assets/images/icons/tm.svg";
import iconLT from "assets/images/icons/lt.svg";

const EpisodeSection = ({
  movie,
  activeEpisode,
  onEpisodeClick,
  audioType,
  onAudioTypeChange,
  onPartChange,
}) => {
  const navigate = useNavigate();

  // If no activeEpisode provided, default to first episode
  const defaultActiveEpisode = activeEpisode || 1;
  const [isCondensed, setIsCondensed] = useState(false);
  const [openPart, setOpenPart] = useState(false);
  const [activePart, setActivePart] = useState(movie.part || "Phần 1");

  // Đồng bộ lại activePart khi movie/part thay đổi (khi điều hướng sang phần khác)
  useEffect(() => {
    setActivePart(movie.part || "Phần 1");
  }, [movie.part]);

  // danh sách phần lấy từ API (fallback 1 phần)
  const parts = movie.parts?.length ? movie.parts : [movie.part || "Phần 1"];

  // đóng dropdown khi click ra ngoài
  const partRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (partRef.current && !partRef.current.contains(e.target)) setOpenPart(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // If movie is hidden, don't show episodes (AFTER ALL HOOKS)
  if (movie.isHidden) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between md:pb-4">
          <h3 className="text-lg md:text-xl font-semibold text-white">Tập phim</h3>
        </div>
        <div className="text-center py-12 text-gray-400">
          <i className="fa-solid fa-lock text-4xl mb-4" />
          <p className="text-lg">Phim này hiện không có sẵn</p>
          <p className="text-sm mt-2">Vui lòng xem trailer hoặc quay lại sau</p>
        </div>
      </div>
    );
  }

  // Tính tổng số tập để phân biệt phim lẻ / phim bộ
  const totalEpisodes = movie.totalEpisodes || movie.episodes?.length || 0;
  const isSingleMovie = totalEpisodes <= 1;

  // Helper: build audio options từ movie.lang (giống logic cũ)
  const buildAudioOptions = () => {
    const rawLang = (movie.lang || "").toLowerCase();
    const parts = rawLang
      .split("+")
      .map((p) => p.trim())
      .filter(Boolean);

    const options = [];
    const addIfNotExists = (key, label, description, colorKey) => {
      if (!options.some((o) => o.key === key)) {
        options.push({ key, label, description, colorKey });
      }
    };

    parts.forEach((part) => {
      if (part.includes("vietsub")) {
        addIfNotExists("vietsub", "Phụ đề", "Bản Vietsub chuẩn nét", "purple");
      }
      if (part.includes("thuyết minh") || part.includes("thuyet minh")) {
        addIfNotExists("thuyet-minh", "Thuyết minh", "Giọng thuyết minh dễ nghe", "green");
      }
      if (part.includes("lồng tiếng") || part.includes("long tieng")) {
        addIfNotExists("long-tieng", "Lồng tiếng", "Thích hợp xem cùng gia đình", "blue");
      }
    });

    // Nếu lang trống hoặc không parse được, fallback 1 bản Vietsub
    if (options.length === 0) {
      addIfNotExists("vietsub", "Phụ đề", "Bản Vietsub chuẩn nét", "purple");
    }

    return options;
  };

  const audioOptions = buildAudioOptions();

  // Giao diện bản chiếu cho phim lẻ (một tập nhưng nhiều bản audio)
  if (isSingleMovie) {
    const handleSelectVersion = (audioKey) => {
      if (onAudioTypeChange) {
        onAudioTypeChange(audioKey);
      }

      if (onEpisodeClick) {
        onEpisodeClick(1, audioKey);
      } else {
        // Nếu ở MovieDetail, điều hướng sang WatchPage
        const audioQuery = audioKey ? `&audio=${encodeURIComponent(audioKey)}` : "";
        navigate(`/watch/${movie.id}?ep=1${audioQuery}`);
      }
    };

    // Màu nền đồng nhất cho từng bản (không dùng gradient nền nữa)
    const bgColorClasses = {
      purple: "bg-[#312e81]",
      blue: "bg-[#1d4ed8]",
      green: "bg-[#15803d] ",
    };

    // Overlay gradient trên poster, khớp với màu nền của bản (trạng thái bình thường)
    const overlayGradients = {
      // Bắt đầu bằng màu đặc (alpha = 1) để che hoàn toàn viền bên trái, sau đó mờ dần
      purple: "linear-gradient(to right, rgba(49, 46, 129, 1), rgba(49, 46, 129, 0))",
      blue: "linear-gradient(to right, rgba(29, 78, 216, 1), rgba(29, 78, 216, 0))",
      green: "linear-gradient(to right, rgba(21, 128, 61, 1), rgba(21, 128, 61, 0))",
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between  md:pb-4">
          <h3 className="text-lg md:text-xl font-semibold text-white">Các bản chiếu</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3">
          {audioOptions.map((opt) => {
            const isActive = audioType === opt.key;
            const bgClass = bgColorClasses[opt.colorKey] || bgColorClasses.blue;

            return (
              <button
                key={opt.key}
                onClick={() => handleSelectVersion(opt.key)}
                className={`${
                  isActive ? "border border-primaryColor" : ""
                } group relative h-12 overflow-hidden rounded-2xl ${bgClass} text-left text-white md:min-h-[180px] min-h-[110px] transition-transform duration-200 hover:-translate-y-1`}
              >
                <div className="flex items-between gap-4">
                  {/* Left content */}
                  <div className="flex-1 flex flex-col justify-between p-4 z-10">
                    {/* Header badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-black/25 flex items-center justify-center">
                        <img
                          src={
                            opt.key === "vietsub"
                              ? iconPD
                              : opt.key === "thuyet-minh"
                              ? iconTM
                              : iconLT
                          }
                          alt={opt.label}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wide text-gray-200">
                          {opt.label}
                        </span>
                        <span className="text-[11px] hidden md:block text-gray-300/90">
                          {opt.description}
                        </span>
                      </div>
                    </div>

                    {/* Movie title */}
                    <div className="space-y-1 mb-4 hidden md:block">
                      <p className="text-base md:text-lg font-semibold line-clamp-2">
                        {movie.title}
                      </p>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium border ${
                          isActive
                            ? "border-white bg-white/10 text-white"
                            : "border-white/40 bg-black/20 text-gray-100"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {isActive ? "Đang xem bản này" : "Sẵn sàng phát"}
                      </span>
                    </div>
                  </div>

                  {/* Right poster image */}
                  {movie.poster && (
                    <div className="hidden sm:block absolute right-0 top-0 w-[40%] h-full rounded-xl overflow-hidden">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover scale-110"
                        draggable="false"
                      />
                      {/* Overlay thường */}
                      <div
                        className="absolute inset-0 transition-opacity duration-200"
                        style={{
                          backgroundImage: overlayGradients[opt.colorKey] || overlayGradients.blue,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Active border glow */}
                {isActive && (
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-offset-2 ring-offset-bgColor ring-primaryColor/80" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Giao diện tập phim cho phim bộ (giữ nguyên logic cũ)
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        {/* Bộ nút filter */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Dropdown "Phần" */}
          <div className="relative" ref={partRef}>
            <button
              onClick={() => setOpenPart((v) => !v)}
              className="inline-flex items-center justify-start gap-2 rounded-md lg:border lg:border-white/15 bg-transparent lg:px-4 px-1 lg:py-2 py-1 text-gray-200 hover:border-primaryColor transition-colors"
            >
              <i className="fa-solid fa-bars text-primaryColor" />
              <span className="font-medium">{activePart}</span>
              <i
                className={`fa-solid fa-caret-down opacity-70 transition-transform ${
                  openPart ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Panel dropdown */}
            {openPart && (
              <div className="absolute z-30 mt-2 w-40 rounded-lg border border-white/15 bg-[#161a22] shadow-xl overflow-hidden">
                <div className="px-4 py-2 text-sm text-gray-300 border-b border-white/10">
                  Danh sách phần
                </div>
                <ul className="py-1">
                  {parts.map((p, idx) => {
                    const isActive = p === activePart;
                    return (
                      <li key={idx}>
                        <button
                          onClick={() => {
                            setActivePart(p);
                            setOpenPart(false);
                            if (onPartChange) {
                              onPartChange(p);
                            }
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors
                            ${
                              isActive
                                ? "bg-primaryColor text-black"
                                : "text-gray-200 hover:bg-white/10"
                            }`}
                        >
                          {p}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Nút chọn ngôn ngữ (Vietsub / Thuyết Minh / Lồng tiếng) dựa trên movie.lang */}
          <div className="flex items-center gap-2">
            {audioOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onAudioTypeChange && onAudioTypeChange(opt.key)}
                className={`flex lg:inline-flex items-center gap-2 rounded-md px-2 py-1 sm:px-4 sm:py-2 text-gray-200 text-sm transition-colors
                ${
                  audioType === opt.key
                    ? "border border-primaryColor"
                    : "lg:border lg:border-white/15 hover:border-primaryColor"
                }`}
              >
                <i
                  className={`fa-solid ${opt.key === "vietsub" ? "fa-file-alt" : "fa-microphone"}`}
                />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Công tắc Rút gọn – dùng pseudo after để knob trượt */}
        <label className="flex items-start -mt-10 lg:-mt-0 lg:items-center gap-3 cursor-pointer select-none">
          <span className="text-sm text-gray-200">Rút gọn</span>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={isCondensed}
            onChange={(e) => setIsCondensed(e.target.checked)}
          />
          {/* track */}
          <span
            className="
              relative inline-block h-6 w-11 rounded-full bg-white/15
              transition-colors duration-300
              peer-checked:bg-primaryColor/70
              after:absolute after:top-0.5 after:left-0.5
              after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md
              after:transition-transform after:duration-300 after:ease-in-out
              peer-checked:after:translate-x-[22px]
            "
          />
        </label>
      </div>

      {/* Lưới tập phim */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {(() => {
          // Tạo map để dễ dàng tìm episode theo số tập
          const episodeMap = new Map();
          (movie.episodes || []).forEach((ep) => {
            const epNum = ep.episode || ep.episodeId;
            if (epNum) {
              const existing = episodeMap.get(epNum);
              if (!existing) {
                // Lưu tạm làm fallback nếu chưa có
                episodeMap.set(epNum, ep);
              } else if (audioType && ep.audioType === audioType) {
                // Ưu tiên tập có audioType khớp với lựa chọn hiện tại
                episodeMap.set(epNum, ep);
              } else if (!audioType) {
                // Backward compatibility: nếu không chọn audioType, ghi đè liên tục lấy tập cuối cùng
                episodeMap.set(epNum, ep);
              }
            }
          });

          // Lấy totalEpisodes từ movie (fallback là số lượng episodes hiện có)
          const totalEpisodes = movie.totalEpisodes || movie.episodes?.length || 0;

          // Tạo array từ 1 đến totalEpisodes
          const allEpisodes = Array.from({ length: totalEpisodes }, (_, i) => i + 1);

          // Áp dụng condensed mode nếu cần
          const episodesToShow = isCondensed ? allEpisodes.slice(0, 12) : allEpisodes;

          return episodesToShow.map((episodeNumber) => {
            const episode = episodeMap.get(episodeNumber);
            const isAvailable = !!episode;
            const isActive = defaultActiveEpisode === episodeNumber;

            return (
              <button
                key={episodeNumber}
                disabled={!isAvailable}
                onClick={() => {
                  if (!isAvailable) return;
                  if (onEpisodeClick) {
                    onEpisodeClick(episodeNumber);
                  } else {
                    // Navigate to watch page if no click handler provided (MovieDetail page)
                    const audioQuery = audioType ? `&audio=${encodeURIComponent(audioType)}` : "";
                    navigate(`/watch/${movie.id}?ep=${episodeNumber}${audioQuery}`);
                  }
                }}
                className={`group flex items-center justify-center gap-3 lg:rounded-xl rounded-md font-normal text-sm md:text-base px-2 md:px-6 py-[11px] md:py-[15px] transition-colors ${
                  !isAvailable
                    ? "bg-bgColor2/30 text-gray-500 opacity-50 cursor-not-allowed"
                    : isActive
                    ? "border-primaryColor bg-primaryColor text-black"
                    : "bg-bgColor2 text-white hover:bg-bgColor2/80"
                }`}
              >
                <i
                  className={`fa-solid fa-play text-sm transition-colors ${
                    !isAvailable
                      ? "opacity-30"
                      : isActive
                      ? "opacity-100 text-black"
                      : "opacity-80 group-hover:opacity-100 group-hover:text-primaryColor"
                  }`}
                />
                <span
                  className={`font-normal text-sm md:font-medium transition-colors ${
                    !isAvailable
                      ? "text-gray-500"
                      : isActive
                      ? "text-black"
                      : "group-hover:text-primaryColor"
                  }`}
                >
                  Tập {episodeNumber}
                </span>
              </button>
            );
          });
        })()}
      </div>
    </>
  );
};

export default EpisodeSection;
