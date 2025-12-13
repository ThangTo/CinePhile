import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "contexts/NotificationContext";
import NotificationItem from "./NotificationItem";
import { 
  FiBell, 
  FiCheck, 
  FiArrowRight, 
  FiBellOff,
  FiList 
} from "react-icons/fi";

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

  // Get unread notifications
  const unreadNotifications = getUnreadNotifications();

  // Mark panel as viewed when opened
  useEffect(() => {
    markPanelAsViewed();
  }, [markPanelAsViewed]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && panelRef.current.contains(event.target)) {
        return;
      }
      if (triggerRef?.current && triggerRef.current.contains(event.target)) {
        return;
      }
      onClose();
    };

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
      className="absolute top-full right-0 mt-3 w-[400px] max-w-[calc(100vw-1.5rem)] bg-bgColor3 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 flex flex-col overflow-hidden animate-fade-in origin-top-right ring-1 ring-white/5"
      style={{ maxHeight: '600px' }}
    >
      {/* Background decoration (Glow effect) */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primaryColor/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* --- HEADER SECTION (ĐÃ SỬA) --- 
          1. Đã xóa 'backdrop-blur-md'
          2. Đổi 'bg-bgColor3' thành 'bg-[#1a1a1a]' (hoặc 'bg-gray-900') để tạo nền đặc.
          Lưu ý: Bạn có thể đổi #1a1a1a thành mã màu hex trùng với nền web của bạn.
      */}
      <div className="relative p-5 border-b border-white/5 bg-[#1a1a1a] z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="bg-primaryColor/20 p-1.5 rounded-lg text-primaryColor">
              <FiBell className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">Thông báo</h2>
            {unreadNotifications.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-bold text-black bg-primaryColor rounded-full">
                {unreadNotifications.length}
              </span>
            )}
          </div>
          
          <button
            onClick={handleViewAll}
            className="group flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-primaryColor transition-colors"
          >
            Xem tất cả <FiArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <FiList className="w-3 h-3" /> Mới nhất
          </p>
          {unreadNotifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors hover:bg-white/10 px-2 py-1 rounded-md"
            >
              <FiCheck className="w-3 h-3 text-primaryColor" />
              Đánh dấu đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="relative flex-1 overflow-y-auto custom-scrollbar bg-[#1a1a1a]">
        {unreadNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-600">
              <FiBellOff size={28} />
            </div>
            <h3 className="text-white font-medium mb-1">Không có thông báo mới</h3>
            <p className="text-sm text-gray-500 max-w-[200px]">
              Bạn đã đọc hết tất cả thông báo gần đây.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {unreadNotifications.slice(0, 5).map((notification) => (
              <div 
                key={notification.id} 
                className="transition-colors hover:bg-white/[0.02]"
              >
                <NotificationItem
                  notification={notification}
                  isActive={activeNotificationId === notification.id}
                  onDelete={deleteNotification}
                />
              </div>
            ))}
            
            {unreadNotifications.length > 5 && (
              <button 
                onClick={handleViewAll}
                className="w-full py-3 text-xs text-gray-500 hover:text-primaryColor hover:bg-white/5 transition-all text-center border-t border-white/5"
              >
                Xem thêm {unreadNotifications.length - 5} thông báo khác
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;