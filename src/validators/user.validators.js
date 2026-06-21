const { body } = require('express-validator');

const updateProfileValidators = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 }).withMessage('Full name must be 2–60 characters'),

  body('bio')
    .optional()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location cannot exceed 100 characters'),

  body('languages')
    .optional()
    .isArray().withMessage('Languages must be an array'),

  body('skillsCanTeach')
    .optional()
    .isArray().withMessage('skillsCanTeach must be an array'),

  body('skillsWantToLearn')
    .optional()
    .isArray().withMessage('skillsWantToLearn must be an array'),
];

module.exports = { updateProfileValidators };
