const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { createNotification, notifTemplates } = require('../services/notifService');
const { success, notFound, error, paginated } = require('../utils/apiResponse');
const { getPaginationOptions } = require('../utils/paginate');

// ─── Get Messages in Conversation ────────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) return notFound(res, 'Conversation not found');

    const [messages, total] = await Promise.all([
      Message.find({ conversation: conversationId })
        .populate('sender', 'fullName avatar')
        .sort({ createdAt: -1 }) // latest first
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ conversation: conversationId }),
    ]);

    // Mark messages as read
    await Message.updateMany(
      { conversation: conversationId, receiver: req.user._id, read: false },
      { read: true }
    );

    return paginated(res, messages.reverse(), total, page, limit);
  } catch (err) {
    next(err);
  }
};

// ─── Send Message (REST fallback for socket) ──────────────────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, text, receiverId } = req.body;

    if (!text || !text.trim()) return error(res, 'Message text is required', 400);

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) return notFound(res, 'Conversation not found');

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      receiver: receiverId,
      text: text.trim(),
    });

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    await message.populate('sender', 'fullName avatar');

    // Socket emit
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversationId}`).emit('receive_message', message);
    }

    // Notification
    const tmpl = notifTemplates.new_message(req.user.fullName);
    await createNotification(io, {
      userId: receiverId,
      type: 'new_message',
      ...tmpl,
      senderId: req.user._id,
    });

    return success(res, { message }, 'Message sent');
  } catch (err) {
    next(err);
  }
};

module.exports = { getMessages, sendMessage };
