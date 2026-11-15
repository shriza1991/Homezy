import { useState, useEffect, useCallback } from "react";
import { NotificationContext } from "./notificationContext";
import { useAuth } from "../hooks/useAuth";
import {
  fetchNotifications,
  markNotificationAsRead as apiMarkRead,
  markAllNotificationsAsRead as apiMarkAllRead,
  deleteNotification as apiDeleteNotification,
} from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

export function NotificationProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [loading, setLoading] = useState(false);

  // Connect socket and listen for real-time notifications
  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated || !token) {
      disconnectSocket();
      return;
    }

    // 1. Initial historical fetch
    fetchNotifications(token)
      .then((data) => {
        if (!isMounted) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    // 2. Real-time socket subscription with auto-reconnection
    connectSocket(token, {
      onNotification: (newNotif) => {
        if (!isMounted) return;
        setNotifications((prev) => {
          const notifId = newNotif._id || newNotif.id;
          if (prev.some((n) => (n._id || n.id) === notifId)) return prev;
          return [newNotif, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      },
      onUnreadCount: (data) => {
        if (!isMounted) return;
        if (typeof data?.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      },
      onStatusChange: (status) => {
        if (!isMounted) return;
        setConnectionStatus(status);
      },
      onReconnect: () => {
        // Guarantee reliable delivery: fetch any notifications missed while disconnected
        if (!isMounted) return;
        fetchNotifications(token)
          .then((data) => {
            if (!isMounted) return;
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
          })
          .catch(() => {});
      },
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, token]);

  const markAsRead = useCallback(
    async (id) => {
      if (!token) return;
      try {
        await apiMarkRead(id, token);
        setNotifications((prev) =>
          prev.map((n) => ((n._id || n.id) === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Fallback local update
        setNotifications((prev) =>
          prev.map((n) => ((n._id || n.id) === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [token]
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await apiMarkAllRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  }, [token]);

  const deleteNotification = useCallback(
    async (id) => {
      if (!token) return;
      try {
        await apiDeleteNotification(id, token);
        setNotifications((prev) => {
          const target = prev.find((n) => (n._id || n.id) === id);
          if (target && !target.isRead) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => (n._id || n.id) !== id);
        });
      } catch {
        setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== id));
      }
    },
    [token]
  );

  const refresh = useCallback(() => {
    if (!token) return Promise.resolve();
    return fetchNotifications(token).then((data) => {
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    });
  }, [token]);

  const value = {
    notifications,
    unreadCount,
    connectionStatus,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
