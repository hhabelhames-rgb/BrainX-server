const User = require('../models/User');
const Match = require('../models/Match');

/**
 * BrainX Matching Engine
 *
 * A match exists when:
 *   User A teaches a skill that User B wants to learn
 *   AND User B teaches a skill that User A wants to learn (mutual exchange)
 *
 * Compatibility score = (# of mutually matching skill pairs / max possible pairs) * 100
 * Boosted by rating and completed exchanges.
 */

/**
 * Normalize skill string for comparison (lowercase, trimmed)
 */
const normalizeSkill = (skill) => skill.toLowerCase().trim();

/**
 * Find skill intersection (case-insensitive)
 */
const intersection = (a, b) => {
  const setB = new Set(b.map(normalizeSkill));
  return a.filter((s) => setB.has(normalizeSkill(s)));
};

/**
 * Calculate compatibility score between two users
 */
const calculateCompatibility = (userA, userB) => {
  const aTeachesBWants = intersection(userA.skillsCanTeach, userB.skillsWantToLearn);
  const bTeachesAWants = intersection(userB.skillsCanTeach, userA.skillsWantToLearn);

  if (aTeachesBWants.length === 0 && bTeachesAWants.length === 0) {
    return { score: 0, matchingSkills: [] };
  }

  const totalSkills = new Set([
    ...userA.skillsCanTeach.map(normalizeSkill),
    ...userA.skillsWantToLearn.map(normalizeSkill),
    ...userB.skillsCanTeach.map(normalizeSkill),
    ...userB.skillsWantToLearn.map(normalizeSkill),
  ]).size;

  const matchCount = aTeachesBWants.length + bTeachesAWants.length;
  let score = Math.round((matchCount / Math.max(totalSkills, 1)) * 100);
  score = Math.min(100, score);

  // Bonus for mutual exchange (both teach what the other wants)
  if (aTeachesBWants.length > 0 && bTeachesAWants.length > 0) {
    score = Math.min(100, score + 10);
  }

  // Rating boost (up to +5)
  const ratingBoost = Math.round(((userB.ratingAverage || 0) / 5) * 5);
  score = Math.min(100, score + ratingBoost);

  const matchingSkills = [
    ...aTeachesBWants.map((s) => ({ skill: s, direction: 'user1_teaches' })),
    ...bTeachesAWants.map((s) => ({ skill: s, direction: 'user2_teaches' })),
  ];

  return { score, matchingSkills };
};

/**
 * Generate matches for a user and persist them to DB
 */
const generateMatchesForUser = async (userId) => {
  const currentUser = await User.findById(userId);
  if (!currentUser) return [];

  if (!currentUser.skillsCanTeach.length && !currentUser.skillsWantToLearn.length) return [];

  // Get already matched users
  const existingMatches = await Match.find({
    $or: [{ user1: userId }, { user2: userId }],
  }).select('user1 user2');

  const matchedUserIds = new Set(
    existingMatches.flatMap((m) => [m.user1.toString(), m.user2.toString()])
  );
  matchedUserIds.delete(userId.toString());

  // Find potential partners
  const potentialUsers = await User.find({
    _id: { $ne: userId, $nin: [...matchedUserIds] },
    isBlocked: false,
    isAdmin: { $ne: true }
  }).select('fullName skillsCanTeach skillsWantToLearn ratingAverage');

  const newMatches = [];

  for (const candidate of potentialUsers) {
    const { score, matchingSkills } = calculateCompatibility(currentUser, candidate);
    if (score > 0) {
      try {
        const match = await Match.create({
          user1: userId,
          user2: candidate._id,
          compatibilityScore: score,
          matchingSkills,
          status: 'pending',
        });
        newMatches.push(match);
      } catch (_) {
        // Ignore duplicate key errors (race condition)
      }
    }
  }

  return newMatches;
};

/**
 * Get matches for a user (already in DB), sorted by score
 */
const getMatchesForUser = async (userId) => {
  const matches = await Match.find({
    $or: [{ user1: userId }, { user2: userId }],
    status: 'pending',
  })
    .populate('user1', 'fullName avatar location ratingAverage skillsCanTeach skillsWantToLearn completedExchanges')
    .populate('user2', 'fullName avatar location ratingAverage skillsCanTeach skillsWantToLearn completedExchanges')
    .sort({ compatibilityScore: -1 });

  return matches.map((m) => {
    const isUser1 = m.user1._id.toString() === userId.toString();
    const matchedUser = isUser1 ? m.user2 : m.user1;
    return {
      matchId: m._id,
      user: matchedUser,
      compatibilityScore: m.compatibilityScore,
      matchingSkills: m.matchingSkills,
      status: m.status,
      createdAt: m.createdAt,
    };
  });
};

module.exports = { generateMatchesForUser, getMatchesForUser, calculateCompatibility };
