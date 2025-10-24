import React from "react";

const RatingSidebar = ({ movie }) => {
  return (
    <div className="space-y-6">
      {/* Rating Section */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <i className="fa-solid fa-star" />
            <span className="text-sm">Đánh giá</span>
          </button>
          <button className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <i className="fa-solid fa-comment" />
            <span className="text-sm">Bình luận</span>
          </button>
        </div>

        {/* <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 to-yellow-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{movie.rating}</span>
          </div>
          <div className="text-sm text-gray-300">Đánh giá</div>
        </div> */}
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-full flex items-center gap-1.5 font-medium shadow-md text-sm transition-all">
          <i className="fa-solid fa-smile text-base" />
          <span className="text-sm">{parseFloat(movie.rating).toFixed(1)}</span>
          <span className="text-xs">Đánh giá</span>
        </button>
      </div>
    </div>
  );
};

export default RatingSidebar;
