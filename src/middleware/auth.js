const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const { unauthorized, forbidden } = require('../utils/apiResponse');

/**
 * Protect routes — require valid JWT access token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return unauthorized(res, 'No token provided. Please log in.');
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('-password -refreshTokens');

    if (!user) {
      return unauthorized(res, 'User no longer exists');
    }

    if (user.isBlocked) {
      return forbidden(res, 'Your account has been blocked. Please contact support.');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Access token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Invalid token');
    }
    next(err);
  }
};

/**
 * Admin-only guard (must be used after protect)
 */
const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return forbidden(res, 'Admin access required');
  }
  next();
};

/**
 * Optional auth — sets req.user if token present, doesn't fail if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password -refreshTokens');
      if (user && !user.isBlocked) req.user = user;
    }
  } catch (_) {
    // silently ignore
  }
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
