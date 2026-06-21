const Notification = require('../models/Notification');

/**
 * Create a notification and emit it via socket if user is online
 * @param {object} io - Socket.IO server instance
 * @param {object} data - Notification data
 */
const createNotification = async (io, data) => {
  const { userId, type, title, message, link = null, senderId = null } = data;

  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    link,
    sender: senderId,
  });

  // Emit real-time notification via socket
  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      _id: notification._id,
      type,
      title,
      message,
      link,
      read: false,
      createdAt: notification.createdAt,
      sender: senderId,
    });
  }

  return notification;
};

/**
 * Notification templates
 */
const notifTemplates = {
  new_message: (senderName) => ({
    title: 'New Message',
    message: `${senderName} sent you a message`,
    link: '/messages',
  }),

  match_accepted: (userName) => ({
    title: 'Match Accepted! 🎉',
    message: `${userName} accepted your skill exchange request`,
    link: '/matches',
  }),

  match_rejected: (userName) => ({
    title: 'Match Update',
    message: `${userName} declined your skill exchange request`,
    link: '/matches',
  }),

  new_match: (userName) => ({
    title: 'New Match Found! 🔥',
    message: `You have a new skill match with ${userName}`,
    link: '/matches',
  }),

  session_requested: (userName, skill) => ({
    title: 'Session Requested 📅',
    message: `${userName} wants to book a session for ${skill}`,
    link: '/sessions',
  }),

  session_accepted: (userName, skill) => ({
    title: 'Session Confirmed! ✅',
    message: `${userName} confirmed your ${skill} session`,
    link: '/sessions',
  }),

  session_cancelled: (userName, skill) => ({
    title: 'Session Cancelled',
    message: `Your ${skill} session with ${userName} was cancelled`,
    link: '/sessions',
  }),

  session_completed: (skill) => ({
    title: 'Session Completed 🎓',
    message: `Your ${skill} session is complete. Leave a review!`,
    link: '/sessions',
  }),

  review_received: (userName) => ({
    title: 'New Review ⭐',
    message: `${userName} left you a review`,
    link: '/profile',
  }),
};

module.exports = { createNotification, notifTemplates };
