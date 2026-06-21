const { body } = require('express-validator');
const dns = require('dns').promises;

// Known disposable/fake email domain blocklist
const BLOCKED_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net',
  'guerrillamail.org', 'spam4.me', 'trashmail.com', 'trashmail.me', 'trashmail.net',
  'fakeinbox.com', 'dispostable.com', 'maildrop.cc', 'mailnull.com',
  'spamgourmet.com', 'mytemp.email', '10minutemail.com', 'emailondeck.com',
  'getnada.com', 'zetmail.com', 'burnermail.io', 'discard.email',
]);

const isRealEmailDomain = async (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  if (BLOCKED_DOMAINS.has(domain)) return false;
  return true; // Skipping DNS MX lookup since the local network blocks it
};

const registerValidators = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Full name must be 2–60 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
    .custom(async (email) => {
      const valid = await isRealEmailDomain(email);
      if (!valid) throw new Error('Please use a real email address with a valid domain');
      return true;
    }),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number'),
];

const loginValidators = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidators = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email required'),
];

const resetPasswordValidators = [
  body('token').notEmpty().withMessage('Token is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number'),
];

module.exports = { registerValidators, loginValidators, forgotPasswordValidators, resetPasswordValidators };
