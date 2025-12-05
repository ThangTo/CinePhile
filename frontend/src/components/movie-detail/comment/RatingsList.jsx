import React from "react";
import { RATING_OPTIONS } from "components/watch-page/RatingModal";

// Helper function để tính thời gian đã trôi qua
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
  return `${Math.floor(diffInSeconds / 31536000)} năm trước`;
};

// Map rating (1-10) thành text vui nhộn
const getRatingText = (rating) => {
  if (rating >= 9) {
    return "Phim hay đỉnh nóc kịch trần bay phấp phới";
  }
  if (rating >= 7) {
    return "Phim khá ổn áp cho một cuộc tình";
  }
  if (rating >= 5) {
    return "Phim tạm ổn không hơn, không kém";
  }
  if (rating >= 3) {
    return "Phim dở quá dở, cần cải thiện nhiều";
  }
  return "Phim tệ quá, không nên xem";
};

const RatingItem = ({ rating }) => {
  const ratingText = getRatingText(rating.rating);
  const timeAgo = rating.createdAt ? getTimeAgo(new Date(rating.createdAt)) : "Vừa xong";

  return (
    <div className="bg-bgColor sm:p-2 py-2 rounded-lg hover:border-white/10 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <img
          src={rating.avatar}
          alt={rating.user}
          className="w-12 h-12 rounded-full flex-shrink-0 ring-2 ring-white/10"
        />

        <div className="flex-1 min-w-0">
          {/* User info */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-semibold text-sm text-white">{rating.user}</span>
            <span className="text-gray-400 text-xs">{timeAgo}</span>
          </div>

          {/* Rating với icon star và text vui nhộn */}
          <div className="flex items-center gap-3 mb-2">
            {/* Rating icon và value */}
            <div className="flex items-center gap-1.5">
              <span className="text-primaryColor text-lg font-bold">
                {RATING_OPTIONS.find((option) => option.value === rating.rating)?.emoji}
              </span>
              <span className="text-primaryColor text-lg font-bold">{rating.rating}/10</span>
            </div>

            {/* Stars visualization */}
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <i
                  key={i}
                  className={`fa-solid fa-star text-xs ${
                    i < Math.floor(rating.rating / 2) ? "text-primaryColor" : "text-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Rating text */}
          <p className="text-gray-300 text-sm font-medium">{ratingText}</p>
        </div>
      </div>
    </div>
  );
};

const RatingsList = ({ ratings, className = "" }) => {
  if (!ratings || ratings.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <i className="fa-solid fa-star text-4xl text-gray-400 mb-4" />
        <p className="text-gray-400 text-lg">Chưa có đánh giá nào</p>
        <p className="text-gray-500 text-sm mt-2">Hãy là người đầu tiên đánh giá phim này nhé!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {ratings.map((rating) => (
        <RatingItem key={rating.id} rating={rating} />
      ))}
    </div>
  );
};

export default RatingsList;
