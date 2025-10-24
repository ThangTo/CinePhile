import React, { useState } from "react";
import useToast from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";

const CommentsSection = ({ movie }) => {
  const [commentText, setCommentText] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const { toasts, removeToast, success, warning } = useToast();

  const handleSubmitComment = () => {
    if (!commentText.trim()) {
      warning("Vui lòng nhập nội dung bình luận!");
      return;
    }
    // TODO: Integrate with backend
    success("Bình luận của bạn đã được gửi!");
    setCommentText("");
  };

  const handleLike = () => {
    success("Đã thích bình luận!");
  };

  const handleReply = () => {
    warning("Chức năng trả lời đang được phát triển!");
  };

  return (
    <>
      <section className="container mx-auto px-4 py-8 comments-section">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <i className="fa-solid fa-comment" />
              Bình luận ({movie.comments.length})
            </h3>

            <div className="space-y-4">
              {movie.comments.map((comment) => (
                <div key={comment.id} className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <img
                      src={comment.avatar}
                      alt={comment.user}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{comment.user}</span>
                        <span className="text-gray-400 text-sm">{comment.time}</span>
                        {comment.episode && (
                          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                            {comment.episode}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-300 mb-2">{comment.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <button
                          onClick={handleLike}
                          className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                        >
                          <i className="fa-solid fa-arrow-up" />
                          {comment.likes}
                        </button>
                        <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                          <i className="fa-solid fa-arrow-down" />
                        </button>
                        <button
                          onClick={handleReply}
                          className="hover:text-blue-400 transition-colors"
                        >
                          Trả lời
                        </button>
                        <button className="flex items-center gap-1 hover:text-gray-200 transition-colors">
                          <i className="fa-solid fa-ellipsis" />
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-semibold">Bình luận</span>
                <span className="text-sm text-gray-400">({movie.comments.length})</span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-400">
                  Vui lòng <span className="text-blue-400">đăng nhập</span> để tham gia bình luận.
                </p>
              </div>

              <textarea
                placeholder="Viết bình luận"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={1000}
                className="w-full h-24 bg-gray-700 text-white p-3 rounded border border-gray-600 resize-none focus:border-blue-500 focus:outline-none transition-colors"
              />

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Tiết lộ?</span>
                  <button
                    onClick={() => setIsSpoiler(!isSpoiler)}
                    className={`w-8 h-4 rounded-full relative transition-colors ${
                      isSpoiler ? "bg-blue-500" : "bg-gray-600"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${
                        isSpoiler ? "left-4" : "left-0.5"
                      }`}
                    ></div>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{commentText.length} / 1000</span>
                  <button
                    onClick={handleSubmitComment}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                  >
                    Gửi
                    <i className="fa-solid fa-arrow-right" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default CommentsSection;
