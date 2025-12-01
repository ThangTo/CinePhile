import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const EpisodeSection = ({ movie, activeEpisode, onEpisodeClick, audioType, onAudioTypeChange }) => {
  const navigate = useNavigate();
  // If no activeEpisode provided, default to first episode
  const defaultActiveEpisode = activeEpisode || 1;
  const [isCondensed, setIsCondensed] = useState(false);
  const [openPart, setOpenPart] = useState(false);
  const [activePart, setActivePart] = useState(movie.part || "Phần 1");

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

          {/* Nút "Phụ đề" */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAudioTypeChange && onAudioTypeChange("subtitle")}
              className={`flex lg:inline-flex items-center gap-2 rounded-md px-2 py-1 sm:px-4 sm:py-2 text-gray-200 text-sm transition-colors
              ${
                audioType === "subtitle"
                  ? "border border-primaryColor"
                  : "lg:border lg:border-white/15 hover:border-primaryColor"
              }`}
            >
              <i className="fa-solid fa-file-alt" />
              <span>Phụ đề</span>
            </button>
            {/* Nút "Lồng tiếng" — chỉ hiển thị nếu API có */}
            {/* {movie.hasDub && ( */}
            <button
              onClick={() => onAudioTypeChange && onAudioTypeChange("dub")}
              className={`flex lg:inline-flex items-center gap-2 rounded-md px-2 py-1 sm:px-4 sm:py-2 text-gray-200 text-sm transition-colors
                ${
                  audioType === "dub"
                    ? "border border-primaryColor"
                    : "lg:border lg:border-white/15 hover:border-primaryColor"
                }`}
            >
              <i className="fa-solid fa-microphone" />
              <span>Lồng tiếng</span>
            </button>
            {/* )} */}
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
            if (epNum) episodeMap.set(epNum, ep);
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
                    navigate(`/watch/${movie.id}?ep=${episodeNumber}`);
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
