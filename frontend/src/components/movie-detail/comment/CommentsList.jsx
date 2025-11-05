import React from "react";
import CommentItem from "./CommentItem";

const CommentsList = ({
  comments,
  onLike,
  onDislike,
  onReply,
  onMore,
  showAll,
  onShowMore,
  hasMore,
  className = "",
}) => {
  return (
    <div className={className}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onLike={onLike}
          onDislike={onDislike}
          onReply={onReply}
          onMore={onMore}
        />
      ))}

      {/* Show More Button */}
      {hasMore && !showAll && (
        <button
          onClick={onShowMore}
          className="w-full py-3 lg:py-4 text-center text-primaryColor hover:text-primaryColor/80 font-medium transition-colors lg:text-lg"
        >
          Xem thêm bình luận...
        </button>
      )}
    </div>
  );
};

export default CommentsList;
