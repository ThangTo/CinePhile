import React from "react";
import { useNavigate } from "react-router-dom";
import { formatTimeAgo } from "utils/dateUtils";
import { useNotifications } from "contexts/NotificationContext";
import { FiTrash2, FiClock, FiBell, FiCircle } from "react-icons/fi"; // Sử dụng React Icons

const NotificationItem = ({ notification, isActive = false, onDelete }) => {
  const navigate = useNavigate();
  const { markAsRead, setActiveNotificationId } = useNotifications();

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setActiveNotificationId(notification.id);

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else {
      navigate("/account?tabs=notifications");
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  // Xác định style dựa trên trạng thái
  const isRead = notification.isRead;

  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex items-start gap-4 p-4 cursor-pointer transition-all duration-300
        border-b border-white/5
        ${
          isActive
            ? "bg-primaryColor/[0.08] border-l-4 border-l-primaryColor" // Active: Nền sáng nhẹ + dải màu trái
            : "border-l-4 border-l-transparent hover:bg-white/[0.03]" // Normal: Hover sáng nhẹ
        }
      `}
    >
      {/* 1. Icon Section */}
      <div className="flex-shrink-0 relative">
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center shadow-lg
            ${
              !isRead
                ? "bg-gradient-to-br from-primaryColor to-indigo-600 text-white shadow-primaryColor/30"
                : "bg-gray-800 text-gray-400"
            }
          `}
        >
          <FiBell className={`${!isRead ? "animate-swing" : ""} text-lg`} />
        </div>
        
        {/* Unread Indicator Dot (Glow effect) */}
        {!isRead && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-[#1a1a1a]"></span>
          </span>
        )}
      </div>

      {/* 2. Content Section */}
      <div className="flex-1 min-w-0 pr-6"> {/* pr-6 để tránh nút xóa đè lên chữ */}
        <div className="flex flex-col gap-1">
          {/* Title Header */}
          <div className="flex items-center justify-between">
            <h3 
              className={`text-sm font-semibold truncate pr-2 ${
                !isRead ? "text-white" : "text-gray-400"
              }`}
            >
              {notification.title}
            </h3>
          </div>

          {/* Message Body */}
          <p className={`text-sm leading-relaxed line-clamp-2 ${
             !isRead ? "text-gray-300" : "text-gray-500"
          }`}>
            {notification.message}
          </p>

          {/* Metadata Footer */}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
              <FiClock className="w-3 h-3" />
              {formatTimeAgo(notification.createdAt)}
            </span>
            
            {/* Tag "Mới" - chỉ hiện khi chưa đọc và là tin mới */}
            {notification.isNew && !isRead && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold tracking-wider uppercase">
                Mới
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Action Button (Hiện khi Hover) */}
      <button
        onClick={handleDelete}
        className="
          absolute top-3 right-3 p-1.5 rounded-lg
          text-gray-500 opacity-0 transform translate-x-2
          group-hover:opacity-100 group-hover:translate-x-0
          hover:bg-red-500/10 hover:text-red-500
          transition-all duration-200 ease-out
        "
        title="Xóa thông báo"
      >
        <FiTrash2 className="w-4 h-4" />
      </button>

      {/* Active Indicator (Glow nền nếu đang active) */}
      {isActive && (
        <div className="absolute inset-0 bg-primaryColor/[0.02] pointer-events-none" />
      )}
    </div>
  );
};

export default NotificationItem;