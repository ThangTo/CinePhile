import React from "react";
import { Star, Clock, Calendar, Globe } from "lucide-react";

const MovieInfoBrief = ({ movie, activeEp }) => {
  // Nếu movie chưa load xong (null/undefined), không render gì cả để tránh lỗi
  if (!movie) return null;

  // Xử lý an toàn cho genres (tránh lỗi undefined.map)
  // Đảm bảo genres luôn là một mảng, dù movie.genres có bị null/undefined
  const genres = Array.isArray(movie.genres) ? movie.genres : [];

  return (
    <div className="bg-[#111827] p-6 rounded-xl border border-gray-800">
      {/* Tiêu đề phim */}
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
        {movie.title}
      </h1>
      
      {/* Tên gốc và tập đang xem */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-4">
        <span className="text-red-500 font-semibold">{movie.englishTitle}</span>
        {activeEp && (
            <>
                <span>|</span>
                <span className="text-yellow-400 font-medium">
                    {/* Hỗ trợ cả 2 trường hợp activeEp là string ("1") hoặc object ({title: "Tập 1"}) */}
                    {typeof activeEp === 'object' ? (activeEp.title || activeEp.episode) : `Tập ${activeEp}`}
                </span>
            </>
        )}
      </div>

      {/* Thông số phim (Rating, Thời lượng, Năm, Quốc gia) */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full text-gray-300">
          <Star className="text-yellow-500 w-4 h-4 fill-current" />
          <span className="font-bold text-white">{movie.rating || 0}</span>
          <span className="text-xs">({movie.totalRatings || 0} đánh giá)</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full text-gray-300">
          <Clock className="text-blue-400 w-4 h-4" />
          <span>{movie.duration || "N/A"}</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full text-gray-300">
          <Calendar className="text-green-400 w-4 h-4" />
          <span>{movie.year}</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full text-gray-300">
          <Globe className="text-purple-400 w-4 h-4" />
          <span>{movie.country || "N/A"}</span>
        </div>
      </div>

      {/* Nội dung mô tả */}
      <div 
        className="text-gray-300 leading-relaxed text-base mb-6"
        dangerouslySetInnerHTML={{ __html: movie.description }} 
      />

      {/* Thể loại (Đã fix lỗi .map) */}
      <div className="pt-6 border-t border-gray-800">
        <span className="text-gray-500 text-sm font-semibold mr-2">Thể loại:</span>
        {genres.length > 0 ? (
          genres.map((g, idx) => (
            <span 
                key={idx} 
                className="inline-block text-red-400 text-sm mr-3 hover:underline cursor-pointer"
            >
                {/* Hỗ trợ cả mảng string ["Hành động"] và mảng object [{name: "Hành động"}] */}
                {typeof g === 'string' ? g : g.name} 
            </span>
          ))
        ) : (
            <span className="text-gray-500 text-sm italic">Đang cập nhật</span>
        )}
      </div>
    </div>
  );
};

export default MovieInfoBrief;