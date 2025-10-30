import React, { useState } from "react";
import RatingModal from "./RatingModal";

const RatingSidebar = ({ movie }) => {
  const [showRatingModal, setShowRatingModal] = useState(false);

  return (
    <>
      <div className="space-y-6">
        {/* Rating Section */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRatingModal(true)}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-star" />
              <span className="text-sm">Đánh giá</span>
            </button>
            <button className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
              <i className="fa-solid fa-comment" />
              <span className="text-sm">Bình luận</span>
            </button>
          </div>

          <button
            onClick={() => setShowRatingModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-full flex items-center gap-1.5 font-medium shadow-md text-sm transition-all"
          >
            <i className="fa-solid fa-smile text-base" />
            <span className="text-sm">{parseFloat(movie.rating).toFixed(1)}</span>
            <span className="text-xs">Đánh giá</span>
          </button>
        </div>
      </div>

      {/* Rating Modal */}
      <RatingModal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} movie={movie} />
    </>
  );
};

export default RatingSidebar;
