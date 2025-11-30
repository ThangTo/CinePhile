import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "contexts/NotificationContext";
import NotificationItem from "./NotificationItem";

const NotificationPanel = ({ onClose, triggerRef }) => {
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const {
    getUnreadNotifications,
    markAllAsRead,
    deleteNotification,
    activeNotificationId,
    markPanelAsViewed,
  } = useNotifications();

  // Get unread notifications (chỉ hiển thị chưa đọc trong panel)
  const unreadNotifications = getUnreadNotifications();

  // Mark panel as viewed when opened (số biến mất khi click bell)
  useEffect(() => {
    markPanelAsViewed();
  }, [markPanelAsViewed]);

  // Close panel when clicking outside (but not on the trigger button)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside panel
      if (panelRef.current && panelRef.current.contains(event.target)) {
        return;
      }

      // Check if click is on the trigger button (bell icon)
      if (triggerRef?.current && triggerRef.current.contains(event.target)) {
        return;
      }

      // Click is outside both panel and trigger button, close panel
      onClose();
    };

    // Use a small delay to avoid immediate close when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, triggerRef]);

  const handleViewAll = () => {
    navigate("/account?tabs=notifications");
    onClose();
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-bgColor2 border border-white/10 rounded-xl shadow-2xl z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">THÔNG BÁO</h2>
          <button
            onClick={handleViewAll}
            className="text-primaryColor hover:text-hoverPrimaryColor text-sm font-medium transition-colors"
          >
            Xem tất cả
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-300">Hoạt động gần đây</p>
          {unreadNotifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-primaryColor hover:text-hoverPrimaryColor text-xs transition-colors"
            >
              Đánh dấu đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {unreadNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <i className="fa-solid fa-bell-slash text-4xl text-gray-500 mb-4"></i>
            <p className="text-gray-400">Không có thông báo mới</p>
          </div>
        ) : (
          <div className="p-2">
            {unreadNotifications.slice(0, 5).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isActive={activeNotificationId === notification.id}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
