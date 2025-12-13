import React, { useState, useMemo, useEffect } from "react";
import { useNotifications } from "contexts/NotificationContext";
import NotificationItem from "./NotificationItem";
import { 
  FiFilter, 
  FiCheck, 
  FiRotateCw, 
  FiChevronLeft, 
  FiChevronRight, 
  FiBellOff,
  FiLayers 
} from "react-icons/fi";

const FILTERS = {
  all: "Tất cả",
  unread: "Chưa đọc",
  read: "Đã đọc",
};

const ITEMS_PER_PAGE = 5;

const NotificationsTab = () => {
  const {
    getAllNotifications,
    markAllAsRead,
    deleteNotification,
    activeNotificationId,
    resetToMockData,
    useMockData,
  } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const allNotifications = getAllNotifications();

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case "unread":
        return allNotifications.filter((n) => !n.isRead);
      case "read":
        return allNotifications.filter((n) => n.isRead);
      default:
        return allNotifications;
    }
  }, [allNotifications, filter]);

  // Sort by date (newest first)
  const sortedNotifications = useMemo(() => {
    return [...filteredNotifications].sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredNotifications]);

  // Pagination
  const totalPages = Math.ceil(sortedNotifications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedNotifications = sortedNotifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll nhẹ lên đầu danh sách thay vì đầu trang web
    document.getElementById("notification-list-top")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" id="notification-list-top">
      
      {/* --- HEADER TOOLBAR --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 shadow-lg">
        
        {/* Left: Filter Tabs */}
        <div className="flex items-center bg-white/[0.04] p-1 rounded-xl">
          {Object.entries(FILTERS).map(([key, label]) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`
                  relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
                  ${isActive ? "text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"}
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primaryColor rounded-lg shadow-sm" style={{ zIndex: -1 }} />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {key === 'all' && <FiLayers className="w-3.5 h-3.5" />}
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {filteredNotifications.some((n) => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-primaryColor bg-primaryColor/10 hover:bg-primaryColor/20 border border-primaryColor/20 rounded-xl transition-all"
            >
              <FiCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Đánh dấu đã đọc</span>
            </button>
          )}

          {useMockData && (
            <button
              onClick={resetToMockData}
              title="Reset Mock Data"
              className="p-2.5 text-gray-400 hover:text-yellow-400 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-transparent hover:border-yellow-400/30"
            >
              <FiRotateCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* --- NOTIFICATION LIST AREA --- */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden shadow-xl min-h-[400px] flex flex-col">
        {paginatedNotifications.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-primaryColor/20 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-24 h-24 bg-white/[0.03] rounded-full flex items-center justify-center border border-white/5">
                  <FiBellOff className="w-10 h-10 text-gray-600" />
                </div>
              </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {filter === "all" ? "Chưa có thông báo nào" : 
               filter === "unread" ? "Không có thông báo mới" : 
               "Chưa có thông báo đã đọc"}
            </h3>
            <p className="text-gray-500 max-w-sm">
              Hệ thống sẽ gửi thông báo cho bạn khi có cập nhật quan trọng hoặc hoạt động mới.
            </p>
          </div>
        ) : (
          /* List Items */
          <div className="flex flex-col">
            {paginatedNotifications.map((notification) => (
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

      {/* --- PAGINATION FOOTER --- */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <p className="text-sm text-gray-500">
            Hiển thị <span className="text-white font-medium">{startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedNotifications.length)}</span> trong tổng số <span className="text-white font-medium">{sortedNotifications.length}</span>
          </p>

          <div className="flex items-center bg-[#1a1a1a] p-1 rounded-xl border border-white/5 shadow-sm">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`
                w-9 h-9 flex items-center justify-center rounded-lg transition-all
                ${currentPage === 1 
                  ? "text-gray-600 cursor-not-allowed" 
                  : "text-gray-300 hover:bg-white/10 hover:text-white"}
              `}
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center px-2 gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`
                    w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                    ${currentPage === page
                      ? "bg-primaryColor text-white shadow-md transform scale-105"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"}
                  `}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`
                w-9 h-9 flex items-center justify-center rounded-lg transition-all
                ${currentPage === totalPages 
                  ? "text-gray-600 cursor-not-allowed" 
                  : "text-gray-300 hover:bg-white/10 hover:text-white"}
              `}
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsTab;