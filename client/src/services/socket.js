import { io } from "socket.io-client";
import { API_URL } from "./api.js";

let socketInstance = null;
let currentToken = null;

// Resolve socket server root URL (strip /api if present)
const getSocketUrl = () => {
  return API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
};

/**
 * Initialize or reuse an authenticated Socket.IO connection with robust reconnection
 * @param {string} token - JWT bearer token
 * @param {Object} [handlers]
 * @param {(notification: any) => void} [handlers.onNotification]
 * @param {(data: { unreadCount: number }) => void} [handlers.onUnreadCount]
 * @param {(status: string) => void} [handlers.onStatusChange]
 * @returns {import("socket.io-client").Socket}
 */
export function connectSocket(token, handlers = {}) {
  if (!token) {
    disconnectSocket();
    return null;
  }

  // If already connected with the same token, attach new handlers and return
  if (socketInstance && currentToken === token) {
    registerHandlers(socketInstance, handlers);
    return socketInstance;
  }

  // Disconnect previous instance if token changed
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  currentToken = token;
  const socketUrl = getSocketUrl();

  socketInstance = io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    transports: ["websocket", "polling"],
  });

  registerHandlers(socketInstance, handlers);

  return socketInstance;
}

/**
 * Register event listeners on socket instance
 */
function registerHandlers(socket, handlers) {
  // Clear any existing custom application listeners to prevent duplicates
  socket.off("notification");
  socket.off("unread_count_updated");
  socket.off("connect");
  socket.off("disconnect");
  socket.off("reconnect");
  socket.off("reconnect_attempt");
  socket.off("connect_error");

  socket.on("connect", () => {
    handlers.onStatusChange?.("connected");
  });

  socket.on("disconnect", (reason) => {
    handlers.onStatusChange?.(reason === "io client disconnect" ? "disconnected" : "reconnecting");
  });

  socket.on("reconnect", () => {
    handlers.onStatusChange?.("connected");
    // Trigger onReconnect to resync missed messages and unread counts
    handlers.onReconnect?.();
  });

  socket.on("reconnect_attempt", () => {
    handlers.onStatusChange?.("reconnecting");
  });

  socket.on("connect_error", (err) => {
    handlers.onStatusChange?.("error");
    handlers.onError?.(err.message);
  });

  if (handlers.onNotification) {
    socket.on("notification", (notif) => {
      handlers.onNotification(notif);
    });
  }

  if (handlers.onUnreadCount) {
    socket.on("unread_count_updated", (data) => {
      handlers.onUnreadCount(data);
    });
  }
}

/**
 * Disconnect and release active socket
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
}

/**
 * Get active socket instance
 */
export function getSocket() {
  return socketInstance;
}
