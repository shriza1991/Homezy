import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

function NotificationBell() {
  const {
    notifications,
    unreadCount,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "application_approved":
        return "🎉";
      case "application_rejected":
        return "⚠️";
      case "application_submitted":
        return "📋";
      case "application_cancelled":
        return "↩️";
      case "property_created":
        return "🏡";
      default:
        return "🔔";
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        className="relative flex items-center justify-center rounded-full p-2 text-white transition hover:bg-indigo-700 focus:outline-none"
      >
        <span className="text-xl">🔔</span>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Socket Connection Status Dot */}
        <span
          title={`Real-time notifications: ${connectionStatus}`}
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-indigo-600 ${
            connectionStatus === "connected"
              ? "bg-emerald-400"
              : connectionStatus === "reconnecting"
              ? "bg-amber-400 animate-pulse"
              : "bg-slate-400"
          }`}
        />
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden text-slate-800 border border-slate-200">
          {/* Header */}
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Mark all read
                </button>
              )}
              <span
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-emerald-500"
                    : connectionStatus === "reconnecting"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
                title={`Socket status: ${connectionStatus}`}
              />
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <span className="text-3xl">📭</span>
                <p className="mt-2 text-sm font-semibold text-slate-700">No notifications</p>
                <p className="mt-1 text-xs text-slate-400">
                  You will receive real-time updates when applications are submitted or reviewed.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const notifId = notif._id || notif.id;

                return (
                  <div
                    key={notifId}
                    className={`relative p-3.5 transition hover:bg-slate-50 ${
                      !notif.isRead ? "bg-indigo-50/60" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatTimestamp(notif.createdAt)}
                          </span>
                        </div>

                        <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                          {!notif.isRead ? (
                            <button
                              type="button"
                              onClick={() => markAsRead(notifId)}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              Mark read
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">Read</span>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteNotification(notifId)}
                            className="text-[11px] text-slate-400 hover:text-red-600"
                            title="Dismiss notification"
                          >
                            &times; Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center text-xs">
            <Link
              to="/rental-requests"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              View Application History &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
