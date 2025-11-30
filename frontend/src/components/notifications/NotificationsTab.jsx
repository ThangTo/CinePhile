import React, { useState, useMemo } from "react";
import { useNotifications } from "contexts/NotificationContext";
import NotificationItem from "./NotificationItem";

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
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(FILTERS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${
                filter === key
                  ? "bg-primaryColor text-primaryColorButtonText"
                  : "bg-bgColor2 text-gray-300 hover:bg-bgColor3"
              }
            `}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {filteredNotifications.filter((n) => !n.isRead).length > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 rounded-lg bg-bgColor2 text-primaryColor hover:bg-bgColor3 transition-all font-medium"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
          {useMockData && (
            <button
              onClick={resetToMockData}
              className="px-4 py-2 rounded-lg bg-bgColor2 text-yellow-400 hover:bg-bgColor3 transition-all font-medium text-sm"
              title="Reset về mock data ban đầu"
            >
              <i className="fa-solid fa-rotate-right mr-2"></i>
              Reset Mock Data
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {paginatedNotifications.length === 0 ? (
          <div className="p-12 text-center bg-bgColor2 rounded-lg">
            <i className="fa-solid fa-bell-slash text-5xl text-gray-500 mb-4"></i>
            <p className="text-gray-400 text-lg">
              {filter === "all"
                ? "Không có thông báo nào"
                : filter === "unread"
                ? "Không có thông báo chưa đọc"
                : "Không có thông báo đã đọc"}
            </p>
          </div>
        ) : (
          paginatedNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isActive={activeNotificationId === notification.id}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`
              px-4 py-2 rounded-lg transition-all
              ${
                currentPage === 1
                  ? "bg-bgColor2 text-gray-500 cursor-not-allowed"
                  : "bg-bgColor2 text-white hover:bg-bgColor3"
              }
            `}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`
                px-4 py-2 rounded-lg transition-all min-w-[40px]
                ${
                  currentPage === page
                    ? "bg-primaryColor text-primaryColorButtonText font-semibold"
                    : "bg-bgColor2 text-white hover:bg-bgColor3"
                }
              `}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`
              px-4 py-2 rounded-lg transition-all
              ${
                currentPage === totalPages
                  ? "bg-bgColor2 text-gray-500 cursor-not-allowed"
                  : "bg-bgColor2 text-white hover:bg-bgColor3"
              }
            `}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      )}

      {/* Page Info */}
      {totalPages > 1 && (
        <div className="text-center text-sm text-gray-400">
          Trang {currentPage} / {totalPages} ({sortedNotifications.length} thông báo)
        </div>
      )}
    </div>
  );
};

export default NotificationsTab;
