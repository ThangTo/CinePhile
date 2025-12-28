import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
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
  const [activeNotificationId, setActiveNotificationId] = useState(null);
  const [lastViewedAt, setLastViewedAt] = useState(() => {
    const saved = localStorage.getItem("cinephine_notifications_last_viewed");
    return saved ? new Date(saved) : null;
  });

  // Load notifications on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    } else {
      // Clear notifications when logged out
      setNotifications([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Load notifications from API
  const loadNotifications = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const response = await notificationService.getNotifications({ limit: 100 });
      // Convert date strings to Date objects
      const formattedNotifications = (response.notifications || response.data || []).map((n) => ({
        ...n,
        id: n._id || n.id,
        createdAt: new Date(n.createdAt),
        actionUrl: n.targetUrl || n.actionUrl || (n.movieId ? `/movie/${n.movieId}` : null),
      }));
      setNotifications(formattedNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      // Set empty array on error instead of mock data
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load unread count from API
  const loadUnreadCount = async () => {
    if (!isAuthenticated) return 0;
    try {
      const response = await notificationService.getUnreadCount();
      return response.count || 0;
    } catch (error) {
      console.error("Error loading unread count:", error);
      return 0;
    }
  };

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

  // Fetch unread count from API periodically and refresh notifications
  // Only poll when page is visible (not in background tab)
  useEffect(() => {
    if (!isAuthenticated) return;

    let interval;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear interval
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } else {
        // Page is visible, start polling
        if (!interval) {
          loadNotifications(); // Load immediately when page becomes visible
          interval = setInterval(() => {
            loadNotifications();
          }, 30000); // Check every 30 seconds
        }
      }
    };

    // Start polling if page is visible
    if (!document.hidden) {
      interval = setInterval(() => {
        loadNotifications();
      }, 30000);
    }

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (interval) {
        clearInterval(interval);
    }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Mark notification as read
  const markAsRead = async (id) => {
    if (!isAuthenticated) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, isNew: false } : n))
    );

    try {
      await notificationService.markAsRead(id);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revert on error
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!isAuthenticated) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, isNew: false })));

    // Sync with API
    try {
      await notificationService.markAllAsRead();
      // Reload notifications to get updated state
      await loadNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
      // Reload to revert optimistic update
      await loadNotifications();
    }
  };

  // Delete notification
  const deleteNotification = async (id) => {
    if (!isAuthenticated) return;

    // Optimistic update
    const deletedNotification = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // Sync with API
    try {
      await notificationService.deleteNotification(id);
    } catch (error) {
      console.error("Error deleting notification:", error);
      // Revert on error
      if (deletedNotification) {
        setNotifications((prev) => [...prev, deletedNotification]);
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
    if (isAuthenticated) {
      await loadNotifications();
    }
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
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
