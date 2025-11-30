import React from "react";
import { useNavigate } from "react-router-dom";
import { formatTimeAgo } from "constants/notificationsMock";
import { useNotifications } from "contexts/NotificationContext";

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
      // Navigate to notifications tab if no action URL
      navigate("/account?tabs=notifications");
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all
        ${
          isActive
            ? "bg-bgColor2 border-2 border-primaryColor shadow-lg shadow-primaryColor/20"
            : "bg-bgColor2 border-2 border-transparent"
        }
        ${notification.isRead ? "opacity-60" : "opacity-100"}
        hover:bg-bgColor2 hover:border-white/10
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primaryColor/20 flex items-center justify-center">
        <i className="fa-solid fa-bell text-primaryColor text-sm"></i>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white text-sm">{notification.title}</h3>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatTimeAgo(notification.createdAt)}
          </span>
        </div>
        <p className="text-sm text-gray-300 mb-2">{notification.message}</p>
        <div className="flex items-center gap-2">
          {notification.isNew && !notification.isRead && (
            <span className="px-2 py-0.5 bg-primaryColor text-primaryColorButtonText text-xs font-semibold rounded">
              MỚI
            </span>
          )}
          <button
            onClick={handleDelete}
            className="text-gray-400 text-xs transition-colors border border-gray-500 rounded-md px-2 py-0.5 hover:border-red-400 hover:bg-red-400 hover:text-primaryColorButtonText"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
