const express = require('express');
const router = express.Router();
const { register, login, logout, refreshToken, getMe, verifyEmail, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { registerValidators, loginValidators, forgotPasswordValidators, resetPasswordValidators } = require('../validators/auth.validators');

router.post('/register', registerValidators, validate, register);
router.post('/login', authLimiter, loginValidators, validate, login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidators, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidators, validate, resetPassword);

module.exports = router;
