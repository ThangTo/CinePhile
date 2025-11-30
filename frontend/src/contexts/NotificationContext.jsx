import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { mockNotifications } from "constants/notificationsMock";
import notificationService from "services/notification.service";
import useAuth from "hooks/useAuth";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(true); // Set to false to use API
  const [activeNotificationId, setActiveNotificationId] = useState(null);
  const [lastViewedAt, setLastViewedAt] = useState(() => {
    const saved = localStorage.getItem("cinephine_notifications_last_viewed");
    return saved ? new Date(saved) : null;
  });

  // Load notifications on mount and when auth state changes
  useEffect(() => {
    if (useMockData) {
      // Use mock data
      const saved = localStorage.getItem("cinephine_notifications");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNotifications(
            parsed.map((n) => ({
              ...n,
              createdAt: new Date(n.createdAt),
            }))
          );
        } catch (e) {
          setNotifications(mockNotifications);
        }
      } else {
        setNotifications(mockNotifications);
      }
    } else if (isAuthenticated) {
      // Fetch from API
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, useMockData]);

  // Load notifications from API
  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await notificationService.getNotifications({ limit: 100 });
      // Convert date strings to Date objects
      const formattedNotifications = response.notifications.map((n) => ({
        ...n,
        id: n._id || n.id,
        createdAt: new Date(n.createdAt),
      }));
      setNotifications(formattedNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      // Fallback to mock data on error
      setNotifications(mockNotifications);
    } finally {
      setIsLoading(false);
    }
  };

  // Load unread count from API
  const loadUnreadCount = async () => {
    if (useMockData || !isAuthenticated) return;
    try {
      const response = await notificationService.getUnreadCount();
      return response.count;
    } catch (error) {
      console.error("Error loading unread count:", error);
      return 0;
    }
  };

  // Save to localStorage whenever notifications change (only for mock data)
  useEffect(() => {
    if (useMockData) {
      localStorage.setItem("cinephine_notifications", JSON.stringify(notifications));
    }
  }, [notifications, useMockData]);

  // Mark notifications panel as viewed (số biến mất khi click bell)
  const markPanelAsViewed = () => {
    const now = new Date();
    setLastViewedAt(now);
    localStorage.setItem("cinephine_notifications_last_viewed", now.toISOString());
  };

  // Get unread notifications count (chỉ tính các thông báo mới sau lần xem cuối)
  const unreadCount = useMemo(() => {
    if (!lastViewedAt) {
      return notifications.filter((n) => !n.isRead).length;
    }
    return notifications.filter((n) => !n.isRead && new Date(n.createdAt) > lastViewedAt).length;
  }, [notifications, lastViewedAt]);

  // Fetch unread count from API periodically (if using API)
  useEffect(() => {
    if (!useMockData && isAuthenticated) {
      const interval = setInterval(() => {
        loadUnreadCount().then((count) => {
          // Update unread count if needed
          // This can be used to sync with backend
        });
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMockData, isAuthenticated]);

  // Mark notification as read
  const markAsRead = async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, isNew: false } : n))
    );

    // Sync with API if not using mock
    if (!useMockData && isAuthenticated) {
      try {
        await notificationService.markAsRead(id);
      } catch (error) {
        console.error("Error marking notification as read:", error);
        // Revert on error
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      }
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, isNew: false })));

    // Sync with API if not using mock
    if (!useMockData && isAuthenticated) {
      try {
        await notificationService.markAllAsRead();
      } catch (error) {
        console.error("Error marking all as read:", error);
      }
    }
  };

  // Delete notification
  const deleteNotification = async (id) => {
    // Optimistic update
    const deletedNotification = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // Sync with API if not using mock
    if (!useMockData && isAuthenticated) {
      try {
        await notificationService.deleteNotification(id);
      } catch (error) {
        console.error("Error deleting notification:", error);
        // Revert on error
        if (deletedNotification) {
          setNotifications((prev) => [...prev, deletedNotification]);
        }
      }
    }
  };

  // Get unread notifications only
  const getUnreadNotifications = () => {
    return notifications.filter((n) => !n.isRead);
  };

  // Get all notifications
  const getAllNotifications = () => {
    return notifications;
  };

  // Refresh notifications from API
  const refreshNotifications = async () => {
    if (!useMockData && isAuthenticated) {
      await loadNotifications();
    }
  };

  // Reset notifications to mock data (xóa localStorage và load lại mock)
  const resetToMockData = () => {
    localStorage.removeItem("cinephine_notifications");
    localStorage.removeItem("cinephine_notifications_last_viewed");
    setNotifications(mockNotifications);
    setLastViewedAt(null);
  };

  const value = {
    notifications,
    unreadCount,
    isLoading,
    activeNotificationId,
    setActiveNotificationId,
    markAsRead,
    markAllAsRead,
    markPanelAsViewed,
    deleteNotification,
    getUnreadNotifications,
    getAllNotifications,
    refreshNotifications,
    resetToMockData, // Reset về mock data ban đầu
    useMockData,
    setUseMockData, // Allow switching between mock and API
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
