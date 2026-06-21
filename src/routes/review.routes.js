const express = require('express');
const router = express.Router();
const { createReview, getUserReviews } = require('../controllers/review.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createReviewValidators } = require('../validators/review.validators');

router.post('/', protect, createReviewValidators, validate, createReview);
router.get('/user/:id', protect, getUserReviews);

module.exports = router;
