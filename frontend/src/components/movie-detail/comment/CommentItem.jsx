import React from "react";

const CommentItem = ({ comment, onLike, onDislike, onReply, onMore }) => {
  return (
    <div className="bg-bgColor sm:p-4 py-3 rounded-lg hover:border-white/10 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <img
          src={comment.avatar}
          alt={comment.user}
          className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-white/10"
        />

        <div className="flex-1 min-w-0">
          {/* User info & badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-semibold text-white">{comment.user}</span>
            {comment.badge === "vip" && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-2 py-0.5 rounded text-xs font-bold">
                <i className="fa-solid fa-infinity text-xs" />
              </span>
            )}
            <span className="text-gray-400 text-xs">{comment.time}</span>
            {comment.episode && (
              <span className="bg-blue-600/80 text-white px-2 py-0.5 rounded text-xs font-medium">
                {comment.episode}
              </span>
            )}
          </div>

          {/* Rating (if exists) */}
          {comment.rating && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-yellow-400 text-lg font-bold">{comment.rating}/10</span>
              <i className="fa-solid fa-fire text-orange-500 text-base" />
            </div>
          )}

          {/* Comment content */}
          <p className="text-gray-300 text-sm lg:text-base mb-3 leading-relaxed break-words whitespace-pre-wrap">
            {comment.content}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <button
              onClick={() => onLike && onLike(comment.id)}
              className="flex items-center gap-1.5 hover:text-blue-400 transition-colors group"
            >
              <i className="fa-solid fa-arrow-up text-sm group-hover:scale-110 transition-transform" />
              <span className="font-medium">{comment.likes || 0}</span>
            </button>

            <button
              onClick={() => onDislike && onDislike(comment.id)}
              className="flex items-center gap-1.5 hover:text-red-400 transition-colors group"
            >
              <i className="fa-solid fa-arrow-down text-sm group-hover:scale-110 transition-transform" />
              {comment.dislikes > 0 && <span className="font-medium">{comment.dislikes}</span>}
            </button>

            <button
              onClick={() => onReply && onReply(comment.id)}
              className="flex items-center gap-1.5 hover:text-blue-400 transition-colors group"
            >
              <i className="fa-solid fa-reply text-sm group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline">Trả lời</span>
              {comment.replies > 0 && (
                <span className="text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded">
                  {comment.replies}
                </span>
              )}
            </button>

            <button
              onClick={() => onMore && onMore(comment.id)}
              className="flex items-center gap-1.5 hover:text-gray-200 transition-colors group"
            >
              <i className="fa-solid fa-ellipsis group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline">Thêm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
