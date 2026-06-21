const Notification = require('../models/Notification');
const { success, notFound, error } = require('../utils/apiResponse');

// ─── Get Notifications ────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('sender', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

    return success(res, { notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// ─── Mark One Read ────────────────────────────────────────────────────────────
const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notification) return notFound(res, 'Notification not found');

    notification.read = true;
    await notification.save();

    return success(res, { notification }, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

// ─── Mark All Read ────────────────────────────────────────────────────────────
const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return success(res, {}, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

// ─── Delete Notification ──────────────────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!notification) return notFound(res, 'Notification not found');
    return success(res, {}, 'Notification deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead, markAllRead, deleteNotification };
