import React from "react";

const CommentItem = ({ comment, onLike, onDislike, onReply, onMore, onDelete, currentUserId }) => {
  // Kiểm tra xem comment có phải của user hiện tại không
  const isOwner =
    currentUserId &&
    (comment.userId === currentUserId ||
      comment.userId?._id === currentUserId ||
      comment.userId?.id === currentUserId);
  return (
    <div className="bg-bgColor sm:p-2 py-2 rounded-lg hover:border-white/10 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <img
          src={comment.avatar}
          alt={comment.user}
          className="w-12 h-12 rounded-full flex-shrink-0 ring-2 ring-white/10"
        />

        <div className="flex-1 min-w-0">
          {/* User info & badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-semibold text-sm text-white">{comment.user}</span>
            {comment.badge === "vip" && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-primaryColor to-hoverPrimaryColor text-primaryColorButtonText px-2 py-0.5 rounded text-xs font-bold">
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
              <span className="text-primaryColor text-lg font-bold">{comment.rating}/10</span>
              <i className="fa-solid fa-fire text-orange-500 text-base" />
            </div>
          )}

          {/* Comment content */}
          <p className="text-gray-300 text-sm mb-3 leading-relaxed break-words whitespace-pre-wrap">
            {comment.content}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => onLike && onLike(comment.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200 group ${
                comment.isLiked
                  ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                  : "text-gray-400 hover:bg-gray-700/50 hover:text-blue-500"
              }`}
            >
              <i
                className={`fa-solid fa-thumbs-up text-base transition-all duration-200 ${
                  comment.isLiked
                    ? "scale-110 drop-shadow-lg"
                    : "group-hover:scale-110 group-hover:rotate-[-5deg]"
                }`}
              />
              <span
                className={`font-semibold min-w-[1rem] text-center transition-colors ${
                  comment.isLiked ? "text-blue-500" : "text-gray-400"
                }`}
              >
                {comment.likes || 0}
              </span>
            </button>

            <button
              onClick={() => onDislike && onDislike(comment.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200 group ${
                comment.isDisliked
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  : "text-gray-400 hover:bg-gray-700/50 hover:text-red-500"
              }`}
            >
              <i
                className={`fa-solid fa-thumbs-down text-base transition-all duration-200 ${
                  comment.isDisliked
                    ? "scale-110 drop-shadow-lg"
                    : "group-hover:scale-110 group-hover:rotate-[5deg]"
                }`}
              />
              <span
                className={`font-semibold min-w-[1rem] text-center transition-colors ${
                  comment.isDisliked ? "text-red-500" : "text-gray-400"
                }`}
              >
                {comment.dislikes || 0}
              </span>
            </button>

            {/* <button
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
            </button> */}

            {/* Hiển thị icon thùng rác nếu là comment của user hiện tại, ngược lại hiển thị icon ... */}
            {isOwner ? (
              <button
                onClick={() => onDelete && onDelete(comment.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 group"
                title="Xóa bình luận"
              >
                <i className="fa-solid fa-trash text-sm group-hover:scale-110 transition-transform" />
                <span className="hidden lg:inline">Xóa</span>
              </button>
            ) : (
              <></>
              // <button
              //   onClick={() => onMore && onMore(comment.id)}
              //   className="flex items-center gap-1.5 hover:text-gray-200 transition-colors group"
              // >
              //   <i className="fa-solid fa-ellipsis group-hover:scale-110 transition-transform" />
              //   <span className="hidden lg:inline">Thêm</span>
              // </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
