import React from "react";
import { useNavigate } from "react-router-dom";

const infoBadges = [
  { label: "IMDb", value: "6.7" },
  { label: "T13" },
  { label: "2025" },
  { label: "1h 59m" },
  { label: "CAM" },
];

const genres = ["Hành Động", "Chiếu Rạp", "Khoa Học", "Phiêu Lưu", "Giả Tưởng"];

const Banner = ({ movie }) => {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden z-0">
      {/* Background image full-bleed behind text */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://static.nutscdn.com/vimg/1920-0/87be50dfeaea826bd1c9f2a0811adff0.webp"
          alt="bg"
          className="h-full w-full object-cover object-right"
        />
      </div>
      {/* Dark gradient so left text is readable, right remains visible */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0b1220] via-[#0b1220]/80 to-transparent" />

      <div className="relative z-10 container mx-auto px-4 py-12 lg:py-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight">
            TRON
            <span className="block text-2xl lg:text-4xl mt-2">TRÒ CHƠI ẢO GIÁC</span>
            <span className="block text-3xl lg:text-5xl text-cyan-400 mt-1">ARES</span>
          </h1>

          <p className="mt-6 text-gray-300">
            Trò Chơi Ảo Giác (TRON: Ares) theo chân Ares — một thực thể ảo cực kỳ tinh vi được cử từ
            thế giới số đến thế giới thực trong một nhiệm vụ nguy hiểm, đánh dấu cuộc chạm trán đầu
            tiên giữa loài người và những thực thể trí tuệ nhân tạo.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {infoBadges.map((b, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-200"
              >
                {b.label}
                {b.value && <strong className="ml-1 text-white">{b.value}</strong>}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {genres.map((g) => (
              <span
                key={g}
                className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-300"
              >
                {g}
              </span>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => navigate(`/watch/${movie.id}?ep=1`)}
              className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-400 text-black shadow-md transition-all duration-300 hover:shadow-[0_0_25px_5px_rgba(250,204,21,0.8)] hover:scale-105"
            >
              <i className="fa-solid fa-play text-xl" />
            </button>
            <button className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/15">
              <i className="fa-solid fa-heart" />
            </button>
            <button
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/15"
            >
              <i className="fa-solid fa-circle-info" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Banner;
