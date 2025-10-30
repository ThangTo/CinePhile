import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const RATING_OPTIONS = [
  { id: 1, emoji: "🤩", label: "Tuyệt vời", value: 10 },
  { id: 2, emoji: "😙", label: "Phim hay", value: 8 },
  { id: 3, emoji: "😊", label: "Khá ổn", value: 6 },
  { id: 4, emoji: "😕", label: "Phim chán", value: 4 },
  { id: 5, emoji: "😭", label: "Dở tệ", value: 2 },
];

const RatingModal = ({ isOpen, onClose, movie }) => {
  const [selectedRating, setSelectedRating] = useState(null);
  const [comment, setComment] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Submit rating to backend only if rating is selected
    if (selectedRating) {
      console.log("Rating:", selectedRating);
      console.log("Comment:", comment);
      // TODO: Submit rating to backend
    }

    // Close modal and reset
    handleClose();
    setTimeout(() => {
      setSelectedRating(null);
      setComment("");
    }, 300);
  };

  const handleViewRatings = () => {
    // TODO: Navigate to ratings section or show ratings list
    console.log("View all ratings");
    handleClose();
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[100002] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative bg-gradient-to-br from-[#2d3548] to-[#1e2433] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-white/10 transition-all duration-300 ${
          isAnimating ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          aria-label="Close"
        >
          <i className="fa-solid fa-times text-lg"></i>
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <h2 className="text-xl font-bold text-white mb-2">{movie?.title || "Đánh giá phim"}</h2>
          <div className="flex items-center justify-center gap-2">
            <i className="fa-solid fa-star text-yellow-400"></i>
            <span className="text-white font-semibold text-lg">
              {parseFloat(movie?.rating || 0).toFixed(1)}
            </span>
            <span className="text-gray-400 text-sm">/ 7 lượt đánh giá</span>
          </div>
        </div>

        {/* Rating Options */}
        <div className="px-6 py-4">
          <div className="bg-[#1a1f2e]/80 rounded-xl p-4 grid grid-cols-5 gap-3">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedRating(option)}
                className={`flex flex-col items-center justify-center rounded-xl transition-all ${
                  selectedRating?.id === option.id
                    ? "bg-blue-600 scale-105 shadow-lg shadow-blue-500/50 p-3"
                    : "bg-transparent hover:bg-white/10 p-3"
                }`}
              >
                <span className="text-3xl mb-2">{option.emoji}</span>
                <span className="text-xs text-white font-medium text-center leading-tight whitespace-nowrap">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Comment Input */}
        <div className="px-6 py-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Nhập bình luận của bạn..."
            className="w-full bg-[#1a1f2e]/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none transition-colors"
            rows="3"
          />
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Gửi đánh giá
          </button>
          <button
            onClick={handleClose}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl border border-white/20 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default RatingModal;

