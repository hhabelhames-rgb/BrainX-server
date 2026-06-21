const Review = require('../models/Review');
const Session = require('../models/Session');
const User = require('../models/User');
const { createNotification, notifTemplates } = require('../services/notifService');
const { success, created, notFound, error } = require('../utils/apiResponse');

// ─── Create Review ────────────────────────────────────────────────────────────
const createReview = async (req, res, next) => {
  try {
    const { reviewedUserId, sessionId, rating, comment } = req.body;

    // Verify session is completed
    const session = await Session.findById(sessionId);
    if (!session) return notFound(res, 'Session not found');

    if (session.status !== 'completed') {
      return error(res, 'Reviews can only be left after a completed session', 400);
    }

    // Verify reviewer was a participant
    const isParticipant =
      session.teacher.toString() === req.user._id.toString() ||
      session.learner.toString() === req.user._id.toString();

    if (!isParticipant) return error(res, 'You were not part of this session', 403);

    // Check for duplicate review
    const existing = await Review.findOne({ reviewer: req.user._id, session: sessionId });
    if (existing) return error(res, 'You have already reviewed this session', 409);

    const review = await Review.create({
      reviewer: req.user._id,
      reviewedUser: reviewedUserId,
      session: sessionId,
      rating: parseInt(rating),
      comment: comment || '',
    });

    // Update reviewed user's rating stats
    const allReviews = await Review.find({ reviewedUser: reviewedUserId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await User.findByIdAndUpdate(reviewedUserId, {
      ratingAverage: Math.round(avgRating * 10) / 10,
      ratingCount: allReviews.length,
    });

    // Mark session as reviewed
    await Session.findByIdAndUpdate(sessionId, { reviewLeft: true });

    // Notify reviewed user
    const io = req.app.get('io');
    const tmpl = notifTemplates.review_received(req.user.fullName);
    await createNotification(io, {
      userId: reviewedUserId,
      type: 'review_received',
      ...tmpl,
      senderId: req.user._id,
    });

    await review.populate('reviewer', 'fullName avatar');

    return created(res, { review }, 'Review submitted');
  } catch (err) {
    next(err);
  }
};

// ─── Get Reviews for User ─────────────────────────────────────────────────────
const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewedUser: req.params.id })
      .populate('reviewer', 'fullName avatar')
      .sort({ createdAt: -1 });

    return success(res, { reviews });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReview, getUserReviews };
