const User = require('../models/User');
const Session = require('../models/Session');
const Review = require('../models/Review');
const Report = require('../models/Report');
const Message = require('../models/Message');
const { success, notFound, error } = require('../utils/apiResponse');

// ─── Get All Users ────────────────────────────────────────────────────────────
const getAdminUsers = async (req, res, next) => {
  try {
    const { search, isBlocked, isVerified, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (search) filter.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

    const [users, total] = await Promise.all([
      User.find(filter).select('-password -refreshTokens').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return success(res, { users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Reports ──────────────────────────────────────────────────────────
const getAdminReports = async (req, res, next) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'fullName email')
      .populate('reportedUser', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(100);

    return success(res, { reports });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Sessions ─────────────────────────────────────────────────────────
const getAdminSessions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const sessions = await Session.find(filter)
      .populate('teacher', 'fullName email')
      .populate('learner', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(100);

    return success(res, { sessions });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Reviews ──────────────────────────────────────────────────────────
const getAdminReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('reviewer', 'fullName email')
      .populate('reviewedUser', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(100);

    return success(res, { reviews });
  } catch (err) {
    next(err);
  }
};

// ─── Dashboard Statistics ─────────────────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      blockedUsers,
      totalSessions,
      completedSessions,
      totalMessages,
      totalReports,
      pendingReports,
      avgRatingResult,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastSeen: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isBlocked: true }),
      Session.countDocuments(),
      Session.countDocuments({ status: 'completed' }),
      Message.countDocuments(),
      Report.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    ]);

    const avgRating = avgRatingResult[0]?.avg?.toFixed(1) || 0;

    return success(res, {
      users: { total: totalUsers, active: activeUsers, verified: verifiedUsers, blocked: blockedUsers },
      sessions: { total: totalSessions, completed: completedSessions },
      messages: { total: totalMessages },
      reports: { total: totalReports, pending: pendingReports },
      avgRating: parseFloat(avgRating),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Block User ───────────────────────────────────────────────────────────────
const blockUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true, refreshTokens: [] },
      { new: true }
    ).select('-password');

    if (!user) return notFound(res, 'User not found');
    return success(res, { user }, 'User blocked');
  } catch (err) {
    next(err);
  }
};

// ─── Unblock User ─────────────────────────────────────────────────────────────
const unblockUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    ).select('-password');

    if (!user) return notFound(res, 'User not found');
    return success(res, { user }, 'User unblocked');
  } catch (err) {
    next(err);
  }
};

// ─── Delete User ──────────────────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return notFound(res, 'User not found');
    return success(res, {}, 'User deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminUsers, getAdminReports, getAdminSessions, getAdminReviews, getStats, blockUser, unblockUser, deleteUser };
