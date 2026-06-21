const Match = require('../models/Match');
const { getMatchesForUser, generateMatchesForUser } = require('../services/matchEngine');
const { createNotification, notifTemplates } = require('../services/notifService');
const { success, notFound, error } = require('../utils/apiResponse');

// ─── Get Matches ──────────────────────────────────────────────────────────────
const getMatches = async (req, res, next) => {
  try {
    // Generate any new matches first
    await generateMatchesForUser(req.user._id);

    const matches = await getMatchesForUser(req.user._id);
    return success(res, { matches });
  } catch (err) {
    next(err);
  }
};

// ─── Accept Match ─────────────────────────────────────────────────────────────
const acceptMatch = async (req, res, next) => {
  try {
    const { matchId } = req.body;

    const match = await Match.findById(matchId)
      .populate('user1', 'fullName')
      .populate('user2', 'fullName');

    if (!match) return notFound(res, 'Match not found');

    const isParticipant =
      match.user1._id.toString() === req.user._id.toString() ||
      match.user2._id.toString() === req.user._id.toString();

    if (!isParticipant) return error(res, 'Not authorized', 403);

    match.status = 'accepted';
    await match.save();

    // Notify the other user
    const io = req.app.get('io');
    const otherUserId =
      match.user1._id.toString() === req.user._id.toString()
        ? match.user2._id
        : match.user1._id;

    const tmpl = notifTemplates.match_accepted(req.user.fullName);
    await createNotification(io, {
      userId: otherUserId,
      type: 'match_accepted',
      ...tmpl,
      senderId: req.user._id,
    });

    return success(res, { match }, 'Match accepted');
  } catch (err) {
    next(err);
  }
};

// ─── Reject Match ─────────────────────────────────────────────────────────────
const rejectMatch = async (req, res, next) => {
  try {
    const { matchId } = req.body;

    const match = await Match.findById(matchId);
    if (!match) return notFound(res, 'Match not found');

    const isParticipant =
      match.user1.toString() === req.user._id.toString() ||
      match.user2.toString() === req.user._id.toString();

    if (!isParticipant) return error(res, 'Not authorized', 403);

    match.status = 'rejected';
    await match.save();

    return success(res, {}, 'Match rejected');
  } catch (err) {
    next(err);
  }
};

module.exports = { getMatches, acceptMatch, rejectMatch };
