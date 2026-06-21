const { body } = require('express-validator');

const createSessionValidators = [
  body('teacherId')
    .notEmpty().withMessage('Teacher ID is required')
    .isMongoId().withMessage('Invalid teacher ID'),

  body('skill')
    .trim()
    .notEmpty().withMessage('Skill is required')
    .isLength({ max: 100 }).withMessage('Skill name too long'),

  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((val) => {
      if (new Date(val) <= new Date()) {
        throw new Error('Session date must be in the future');
      }
      return true;
    }),

  body('duration')
    .notEmpty().withMessage('Duration is required')
    .isIn([30, 45, 60, 90, 120]).withMessage('Duration must be 30, 45, 60, 90, or 120 minutes'),
];

module.exports = { createSessionValidators };
