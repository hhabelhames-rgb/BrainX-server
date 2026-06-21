const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');
const { success, notFound, error, paginated } = require('../utils/apiResponse');
const { getPaginationOptions, getSortOptions } = require('../utils/paginate');
const { generateMatchesForUser } = require('../services/matchEngine');

// ─── Get Users (Search + Filter + Paginate) ───────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const { search, location, language, skill, sortBy } = req.query;

    const filter = { isBlocked: false, _id: { $ne: req.user._id }, isAdmin: { $ne: true } };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { skillsCanTeach: { $regex: search, $options: 'i' } },
        { skillsWantToLearn: { $regex: search, $options: 'i' } },
      ];
    }

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (language) {
      filter.languages = { $regex: language, $options: 'i' };
    }

    if (skill) {
      filter.$or = [
        { skillsCanTeach: { $regex: skill, $options: 'i' } },
        { skillsWantToLearn: { $regex: skill, $options: 'i' } },
      ];
    }

    const sort = getSortOptions(sortBy);
    const [users, total] = await Promise.all([
      User.find(filter).select('-password -refreshTokens -emailVerificationToken -passwordResetToken').sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return paginated(res, users, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// ─── Get User By ID ───────────────────────────────────────────────────────────
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshTokens -emailVerificationToken -passwordResetToken');
    if (!user || user.isBlocked) return notFound(res, 'User not found');
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['fullName', 'bio', 'location', 'languages', 'skillsCanTeach', 'skillsWantToLearn'];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password -refreshTokens');

    // Regenerate matches when skills change
    if (updates.skillsCanTeach || updates.skillsWantToLearn) {
      generateMatchesForUser(user._id).catch(console.error);
    }

    return success(res, { user }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

// ─── Upload Avatar ────────────────────────────────────────────────────────────
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);

    // Old cloudinary deletion removed

    const avatarUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password -refreshTokens');

    return success(res, { user, avatarUrl }, 'Avatar uploaded');
  } catch (err) {
    next(err);
  }
};

// ─── Remove Avatar ────────────────────────────────────────────────────────────
const removeAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return notFound(res, 'User not found');

    if (user.avatar) {
      try {
        const publicId = user.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`brainx/avatars/${publicId}`);
      } catch (_) {}
    }

    user.avatar = null;
    await user.save();

    return success(res, { user }, 'Avatar removed');
  } catch (err) {
    next(err);
  }
};

// ─── Delete Account ───────────────────────────────────────────────────────────
const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return notFound(res, 'User not found');

    // Delete avatar from Cloudinary
    if (user.avatar) {
      try {
        const publicId = user.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`brainx/avatars/${publicId}`);
      } catch (_) {}
    }

    await User.findByIdAndDelete(req.user._id);
    res.clearCookie('refreshToken');

    return success(res, {}, 'Account deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, updateProfile, uploadAvatar, removeAvatar, deleteAccount };
