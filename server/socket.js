const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

/**
 * Initialize Socket.IO with HTTP server and configure JWT auth middleware
 * @param {import("http").Server} httpServer
 * @param {Object} [customOptions]
 */
function initSocket(httpServer, customOptions = {}) {
  const clientOrigin = process.env.CLIENT_ORIGIN;
  const corsConfig =
    clientOrigin && clientOrigin !== "*"
      ? { origin: clientOrigin.split(",").map((s) => s.trim()), credentials: true }
      : { origin: "*", methods: ["GET", "POST"] };

  io = new Server(httpServer, {
    cors: corsConfig,
    pingTimeout: 20000,
    pingInterval: 25000,
    ...customOptions,
  });

  // Authentication Middleware for all Socket.IO connections
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      const secret = process.env.JWT_SECRET || "homezy_development_secret_key";
      const decoded = jwt.verify(token, secret);
      socket.user = decoded;
      next();
    } catch (error) {
      return next(new Error("Authentication error: " + (error.message || "Invalid or expired token")));
    }
  });

  // Socket Connection Lifecycle
  io.on("connection", (socket) => {
    const user = socket.user;
    const userRoom = `user:${user.id}`;

    // Join personal user room for direct user-scoped notifications
    socket.join(userRoom);

    // If admin, also join the dedicated admin room
    if (user.role === "admin") {
      socket.join("admin");
    }

    // Ping / heartbeat verification
    socket.on("ping", (callback) => {
      if (typeof callback === "function") {
        callback({ status: "pong", timestamp: Date.now() });
      }
    });

    socket.on("disconnect", (reason) => {
      // Disconnection handled cleanly
    });
  });

  return io;
}

/**
 * Get active Socket.IO server instance
 * @returns {import("socket.io").Server | null}
 */
function getIO() {
  return io;
}

/**
 * Close active Socket.IO instance
 */
function closeSocket() {
  if (io) {
    io.close();
    io = null;
  }
}

/**
 * Emit a real-time notification to the target user or admin room
 * @param {Object} notification
 * @param {number} [unreadCount]
 */
function emitNotification(notification, unreadCount) {
  if (!io) return false;

  const recipientId = notification.recipient?.toString() || notification.recipient;

  // 1. Deliver to individual recipient room
  if (recipientId) {
    io.to(`user:${recipientId}`).emit("notification", notification);
    if (typeof unreadCount === "number") {
      io.to(`user:${recipientId}`).emit("unread_count_updated", { unreadCount });
    }
  }

  // 2. Deliver admin-facing events (new applications, withdrawals) to admin room
  const adminEvents = ["application_submitted", "application_cancelled"];
  if (adminEvents.includes(notification.type)) {
    io.to("admin").emit("notification", notification);
  }

  return true;
}

module.exports = {
  initSocket,
  getIO,
  closeSocket,
  emitNotification,
};
