import React, { useEffect, useRef, useState } from "react";

const EpisodeSection = ({ movie, activeEpisode, onEpisodeClick, audioType, onAudioTypeChange }) => {
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
    <div className="p-[6px] pt-[24px]">
      <div className="flex items-center justify-between mb-6">
        {/* Bộ nút filter */}
        <div className="flex items-center gap-4">
          {/* Dropdown "Phần" */}
          <div className="relative" ref={partRef}>
            <button
              onClick={() => setOpenPart((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-transparent px-4 py-2 text-gray-200 hover:border-primaryColor transition-colors"
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
          <button
            onClick={() => onAudioTypeChange && onAudioTypeChange("subtitle")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-gray-200 text-sm transition-colors
              ${
                audioType === "subtitle"
                  ? "border border-primaryColor"
                  : "border border-white/15 hover:border-primaryColor"
              }`}
          >
            <i className="fa-solid fa-file-alt" />
            <span>Phụ đề</span>
          </button>

          {/* Nút "Lồng tiếng" — chỉ hiển thị nếu API có */}
          {/* {movie.hasDub && ( */}
          <button
            onClick={() => onAudioTypeChange && onAudioTypeChange("dub")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-gray-200 text-sm transition-colors
                ${
                  audioType === "dub"
                    ? "border border-primaryColor"
                    : "border border-white/15 hover:border-primaryColor"
                }`}
          >
            <i className="fa-solid fa-microphone" />
            <span>Lồng tiếng</span>
          </button>
          {/* )} */}
        </div>

        {/* Công tắc Rút gọn – dùng pseudo after để knob trượt */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {(isCondensed ? movie.episodes.slice(0, 12) : movie.episodes).map((episode) => {
          const isActive = activeEpisode === episode.id;
          return (
            <button
              key={episode.id}
              onClick={() => onEpisodeClick && onEpisodeClick(episode.id)}
              className={`group flex items-center justify-center gap-3 rounded-xl border px-6 py-5 transition-colors ${
                isActive
                  ? "border-primaryColor bg-primaryColor text-black"
                  : "border-white/10 bg-[#1f2430]/80 text-gray-200 hover:bg-[#2a3140]"
              }`}
            >
              <i
                className={`fa-solid fa-play text-sm transition-colors ${
                  isActive
                    ? "opacity-100 text-black"
                    : "opacity-80 group-hover:opacity-100 group-hover:text-primaryColor"
                }`}
              />
              <span
                className={`font-medium transition-colors ${
                  isActive ? "text-black" : "group-hover:text-primaryColor"
                }`}
              >
                Tập {episode?.title?.replace(/\D/g, "") || episode.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EpisodeSection;
