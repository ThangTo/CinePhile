import React from "react";

/**
 * Reusable empty state component
 * Dùng để hiển thị khi không có dữ liệu / không tìm thấy kết quả.
 *
 * Props:
 * - title: tiêu đề chính
 * - message: mô tả phụ
 * - iconClassName: class Font Awesome cho icon trung tâm
 * - className: CSS bổ sung cho wrapper
 * - actionLabel: text nút hành động (tuỳ chọn)
 * - onAction: callback khi nhấn nút (tuỳ chọn)
 */
const EmptyState = ({
  title = "Không có dữ liệu",
  message = "Hiện tại chưa có nội dung để hiển thị.",
  iconClassName = "fa-magnifying-glass",
  className = "",
  actionLabel,
  onAction,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center text-gray-300 py-10 px-4 ${className}`}
    >
      {/* Icon & halo */}
      <div className="relative mb-4">
        <div className="absolute -inset-4 bg-gradient-to-tr from-primaryColor/20 via-pink-500/10 to-cyan-400/10 rounded-full blur-xl opacity-80" />
        <div className="relative w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
          <i className={`fa-solid ${iconClassName} text-2xl text-primaryColor`} />
        </div>
      </div>

      {/* Text */}
      <h2 className="text-lg md:text-xl font-semibold text-white mb-1">{title}</h2>
      <p className="text-xs md:text-sm text-gray-400 max-w-md">{message}</p>

      {/* Action */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primaryColor text-black px-5 py-2 text-sm font-semibold shadow-lg shadow-primaryColor/40 hover:bg-primaryColor/90 transition-colors"
        >
          <span>{actionLabel}</span>
          <i className="fa-solid fa-arrow-rotate-left text-xs" />
        </button>
      )}
    </div>
  );
};

export default EmptyState;
