const express = require('express');
const router = express.Router();
const { getUsers, getUserById, updateProfile, uploadAvatar, removeAvatar, deleteAccount } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadAvatar: multerAvatar } = require('../middleware/upload');
const { updateProfileValidators } = require('../validators/user.validators');

router.get('/', protect, getUsers);
router.get('/:id', protect, getUserById);
router.put('/profile', protect, updateProfileValidators, validate, updateProfile);
router.put('/avatar', protect, multerAvatar.single('avatar'), uploadAvatar);
router.delete('/avatar', protect, removeAvatar);
router.delete('/account', protect, deleteAccount);

module.exports = router;
