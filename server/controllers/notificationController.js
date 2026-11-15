const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { emitNotification } = require("../socket");

// In-memory notifications fallback when MongoDB is disconnected
let memoryNotifications = [];

/**
 * Programmatic helper to create, persist, and emit notifications
 * @param {Object} payload
 * @param {string} payload.recipient - User ID of recipient
 * @param {string} [payload.sender] - User ID of sender
 * @param {string} payload.title - Notification title
 * @param {string} payload.message - Notification body
 * @param {string} [payload.type] - Notification type
 * @param {string} [payload.relatedId] - Associated entity ID
 */
const createAndEmitNotification = async (payload) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const doc = await Notification.create({
        recipient: payload.recipient,
        sender: payload.sender || null,
        title: payload.title,
        message: payload.message,
        type: payload.type || "system",
        relatedId: payload.relatedId || null,
        isRead: false,
      });

      const unreadCount = await Notification.countDocuments({
        recipient: payload.recipient,
        isRead: false,
      });

      emitNotification(doc.toObject ? doc.toObject() : doc, unreadCount);
      return doc;
    }

    // In-memory fallback
    const memDoc = {
      _id: "notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      recipient: payload.recipient,
      sender: payload.sender || null,
      title: payload.title,
      message: payload.message,
      type: payload.type || "system",
      relatedId: payload.relatedId || null,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryNotifications.unshift(memDoc);

    const unreadCount = memoryNotifications.filter(
      (n) => String(n.recipient) === String(payload.recipient) && !n.isRead
    ).length;

    emitNotification(memDoc, unreadCount);
    return memDoc;
  } catch (error) {
    console.error("[Notification] Failed to create notification:", error.message);
    return null;
  }
};

// GET /api/notifications - Get current authenticated user's notifications
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    if (mongoose.connection.readyState === 1) {
      const [notifications, unreadCount] = await Promise.all([
        Notification.find({ recipient: userId })
          .sort({ createdAt: -1 })
          .limit(50),
        Notification.countDocuments({ recipient: userId, isRead: false }),
      ]);

      return res.status(200).json({
        success: true,
        count: notifications.length,
        unreadCount,
        notifications,
      });
    }

    // In-memory
    const userNotifs = memoryNotifications
      .filter((n) => String(n.recipient) === String(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const unreadCount = userNotifs.filter((n) => !n.isRead).length;

    res.status(200).json({
      success: true,
      count: userNotifs.length,
      unreadCount,
      notifications: userNotifs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications",
      error: error.message,
    });
  }
};

// GET /api/notifications/unread-count - Get total unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    if (mongoose.connection.readyState === 1) {
      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      return res.status(200).json({
        success: true,
        unreadCount,
      });
    }

    const unreadCount = memoryNotifications.filter(
      (n) => String(n.recipient) === String(userId) && !n.isRead
    ).length;

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
      error: error.message,
    });
  }
};

// PATCH /api/notifications/:id/read - Mark single notification as read
const markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "Invalid notification ID format" });
      }

      const notif = await Notification.findById(id);
      if (!notif) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      if (String(notif.recipient) !== String(userId) && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You cannot modify another user's notification",
        });
      }

      notif.isRead = true;
      await notif.save();

      const unreadCount = await Notification.countDocuments({
        recipient: notif.recipient,
        isRead: false,
      });

      // Emit updated count to recipient
      emitNotification({ recipient: notif.recipient, type: "system" }, unreadCount);

      return res.status(200).json({
        success: true,
        notification: notif,
        unreadCount,
      });
    }

    // In-memory
    const target = memoryNotifications.find((n) => String(n._id) === String(id));
    if (!target) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (String(target.recipient) !== String(userId) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot modify another user's notification",
      });
    }

    target.isRead = true;
    target.updatedAt = new Date();

    const unreadCount = memoryNotifications.filter(
      (n) => String(n.recipient) === String(userId) && !n.isRead
    ).length;

    emitNotification({ recipient: userId, type: "system" }, unreadCount);

    res.status(200).json({
      success: true,
      notification: target,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

// PATCH /api/notifications/read-all - Mark all user notifications as read
const markAllAsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    if (mongoose.connection.readyState === 1) {
      await Notification.updateMany({ recipient: userId, isRead: false }, { $set: { isRead: true } });

      emitNotification({ recipient: userId, type: "system" }, 0);

      return res.status(200).json({
        success: true,
        message: "All notifications marked as read",
        unreadCount: 0,
      });
    }

    // In-memory
    memoryNotifications.forEach((n) => {
      if (String(n.recipient) === String(userId)) {
        n.isRead = true;
      }
    });

    emitNotification({ recipient: userId, type: "system" }, 0);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      unreadCount: 0,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};

// DELETE /api/notifications/:id - Delete single notification
const deleteNotification = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "Invalid notification ID" });
      }

      const notif = await Notification.findById(id);
      if (!notif) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      if (String(notif.recipient) !== String(userId) && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Not authorized to delete this notification",
        });
      }

      await Notification.findByIdAndDelete(id);

      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      return res.status(200).json({
        success: true,
        message: "Notification removed",
        unreadCount,
      });
    }

    // In-memory
    const index = memoryNotifications.findIndex((n) => String(n._id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (String(memoryNotifications[index].recipient) !== String(userId) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Not authorized to delete this notification",
      });
    }

    memoryNotifications.splice(index, 1);

    const unreadCount = memoryNotifications.filter(
      (n) => String(n.recipient) === String(userId) && !n.isRead
    ).length;

    res.status(200).json({
      success: true,
      message: "Notification removed",
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

module.exports = {
  createAndEmitNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
