const Conversation = require('../models/Conversation');
const { success, notFound, error } = require('../utils/apiResponse');

// ─── Get All Conversations ────────────────────────────────────────────────────
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'fullName avatar lastSeen isVerified')
      .populate({ path: 'lastMessage', select: 'text createdAt read sender' })
      .sort({ lastMessageAt: -1 });

    // Attach "other user" to each conversation for convenience
    const result = conversations.map((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== req.user._id.toString()
      );
      return { ...conv.toObject(), otherUser };
    });

    return success(res, { conversations: result });
  } catch (err) {
    next(err);
  }
};

// ─── Get or Create Conversation ───────────────────────────────────────────────
const createOrGetConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) return error(res, 'recipientId is required', 400);
    if (recipientId === req.user._id.toString()) {
      return error(res, 'Cannot message yourself', 400);
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    })
      .populate('participants', 'fullName avatar lastSeen isVerified')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId],
      });
      conversation = await conversation.populate('participants', 'fullName avatar lastSeen isVerified');
    }

    return success(res, { conversation });
  } catch (err) {
    next(err);
  }
};

// ─── Create Support Conversation ───────────────────────────────────────────────
const createSupportConversation = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const adminUser = await User.findOne({ isAdmin: true });
    if (!adminUser) return error(res, 'Support admin not found', 404);

    if (adminUser._id.toString() === req.user._id.toString()) {
      return error(res, 'Admin cannot contact support', 400);
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, adminUser._id], $size: 2 },
    })
      .populate('participants', 'fullName avatar lastSeen isVerified')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, adminUser._id],
      });
      conversation = await conversation.populate('participants', 'fullName avatar lastSeen isVerified');
    }

    return success(res, { conversation });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, createOrGetConversation, createSupportConversation };
