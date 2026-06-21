const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { createNotification, notifTemplates } = require('../services/notifService');
const { verifyAccessToken } = require('../utils/jwt');

// Track online users: Map<userId, socketId>
const onlineUsers = new Map();

const initSocket = (io) => {
  // ─── Auth Middleware for Socket ────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('fullName avatar isBlocked');

      if (!user || user.isBlocked) return next(new Error('User not found or blocked'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 Socket connected: ${socket.user.fullName} (${socket.id})`);

    // ─── Track Online Status ─────────────────────────────────────────────────
    onlineUsers.set(userId, socket.id);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // Broadcast online status
    socket.broadcast.emit('user_online', { userId });

    // Update lastSeen
    User.findByIdAndUpdate(userId, { lastSeen: Date.now() }).exec();

    // ─── Join Conversation Room ──────────────────────────────────────────────
    socket.on('join_room', (conversationId) => {
      socket.join(`conv:${conversationId}`);
      console.log(`📬 ${socket.user.fullName} joined room conv:${conversationId}`);
    });

    socket.on('leave_room', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ─── Send Message ────────────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, text, receiverId } = data;

        if (!text?.trim()) return;

        // Verify participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conversation) return;

        // Create message
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          receiver: receiverId,
          text: text.trim(),
        });

        await message.populate('sender', 'fullName avatar');

        // Update conversation
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        // Emit to room
        io.to(`conv:${conversationId}`).emit('receive_message', message);

        // Send notification if receiver is not in the room
        const tmpl = notifTemplates.new_message(socket.user.fullName);
        await createNotification(io, {
          userId: receiverId,
          type: 'new_message',
          ...tmpl,
          senderId: userId,
        });
      } catch (err) {
        console.error('Socket send_message error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── Read Receipt ────────────────────────────────────────────────────────
    socket.on('read_message', async ({ conversationId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, receiver: userId, read: false },
          { read: true }
        );
        socket.to(`conv:${conversationId}`).emit('messages_read', { conversationId, readBy: userId });
      } catch (err) {
        console.error('Socket read_message error:', err.message);
      }
    });

    // ─── Typing Indicators ────────────────────────────────────────────────────
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing_start', {
        userId,
        name: socket.user.fullName,
        conversationId,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing_stop', { userId, conversationId });
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user_offline', { userId });
      User.findByIdAndUpdate(userId, { lastSeen: Date.now() }).exec();
      console.log(`🔌 Socket disconnected: ${socket.user.fullName}`);
    });
  });
};

const getOnlineUsers = () => [...onlineUsers.keys()];

module.exports = { initSocket, getOnlineUsers };
