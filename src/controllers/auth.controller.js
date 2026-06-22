const crypto = require('crypto');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, created, error, unauthorized, notFound } = require('../utils/apiResponse');
const { sendEmail, emailVerificationTemplate, passwordResetTemplate } = require('../services/emailService');
const { generateMatchesForUser } = require('../services/matchEngine');

// ─── Register ────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { fullName, email, password, skillsCanTeach, skillsWantToLearn, location, languages } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error(res, 'Email already registered', 409);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      fullName,
      email,
      password,
      skillsCanTeach: skillsCanTeach || [],
      skillsWantToLearn: skillsWantToLearn || [],
      location: location || '',
      languages: languages || [],
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Send verification email
    try {
      const { subject, html } = emailVerificationTemplate(user.fullName, verificationToken);
      await sendEmail({ to: user.email, subject, html });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
      await User.findByIdAndDelete(user._id);
      return error(res, 'Failed to send verification email. Please try again.', 500);
    }

    // Generate matches in background
    generateMatchesForUser(user._id).catch(console.error);

    return created(res, {}, 'Account created. Please check your email to verify your account before logging in.');
  } catch (err) {
    next(err);
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user) {
      return unauthorized(res, 'Invalid email or password');
    }

    if (user.isBlocked) {
      return error(res, 'Your account has been blocked. Please contact support.', 403);
    }

    if (!user.isVerified) {
      return error(res, 'Please verify your email address before logging in.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return unauthorized(res, 'Invalid email or password');
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    // Rotate refresh tokens (keep max 5 devices)
    const tokens = user.refreshTokens || [];
    tokens.push(refreshToken);
    if (tokens.length > 5) tokens.splice(0, tokens.length - 5);
    user.refreshTokens = tokens;
    user.lastSeen = Date.now();
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshTokens;

    return success(res, { user: userObj, accessToken }, 'Logged in successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Google Login ────────────────────────────────────────────────────────────
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return error(res, 'Google token is required', 400);

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email }).select('+refreshTokens');

    if (!user) {
      // Create new user instantly
      user = await User.create({
        fullName: name,
        email: email,
        password: crypto.randomBytes(16).toString('hex'), // Random password for OAuth users
        avatar: picture,
        isVerified: true, // Google already verified them
      });
      generateMatchesForUser(user._id).catch(console.error);
    }

    if (user.isBlocked) {
      return error(res, 'Your account has been blocked. Please contact support.', 403);
    }

    // Tokens
    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    const tokens = user.refreshTokens || [];
    tokens.push(refreshToken);
    if (tokens.length > 5) tokens.splice(0, tokens.length - 5);
    user.refreshTokens = tokens;
    user.lastSeen = Date.now();
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshTokens;

    return success(res, { user: userObj, accessToken }, 'Logged in with Google');
  } catch (err) {
    console.error('Google Auth Error:', err);
    return error(res, 'Failed to authenticate with Google', 401);
  }
};

// ─── Logout ──────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: token } });
    }

    res.clearCookie('refreshToken');
    return success(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Refresh Token ───────────────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) return unauthorized(res, 'No refresh token');

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(token)) {
      return unauthorized(res, 'Invalid refresh token');
    }

    // Rotate refresh token
    const newAccessToken = signAccessToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);

    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return success(res, { accessToken: newAccessToken }, 'Token refreshed');
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Invalid or expired refresh token');
    }
    next(err);
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return notFound(res, 'User not found');
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return error(res, 'Invalid or expired verification token', 400);
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return success(res, {}, 'Email verified successfully. You can now log in.');
  } catch (err) {
    next(err);
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond 200 to prevent email enumeration
    if (!user) {
      return success(res, {}, 'If that email exists, a reset link has been sent.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save({ validateBeforeSave: false });

    try {
      const { subject, html } = passwordResetTemplate(user.fullName, resetToken);
      await sendEmail({ to: user.email, subject, html });
    } catch (emailErr) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return error(res, 'Email could not be sent. Please try again later.', 500);
    }

    return success(res, {}, 'If that email exists, a reset link has been sent.');
  } catch (err) {
    next(err);
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires +refreshTokens');

    if (!user) {
      return error(res, 'Invalid or expired reset token', 400);
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // invalidate all sessions
    await user.save();

    return success(res, {}, 'Password reset successfully. Please log in.');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, googleLogin, logout, refreshToken, getMe, verifyEmail, forgotPassword, resetPassword };
