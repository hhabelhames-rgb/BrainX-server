const { body } = require('express-validator');

const createReviewValidators = [
  body('reviewedUserId')
    .notEmpty().withMessage('Reviewed user ID is required')
    .isMongoId().withMessage('Invalid user ID'),

  body('sessionId')
    .notEmpty().withMessage('Session ID is required')
    .isMongoId().withMessage('Invalid session ID'),

  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
];

module.exports = { createReviewValidators };
