const express = require('express');
const router = express.Router();
const { getMatches, acceptMatch, rejectMatch } = require('../controllers/match.controller');
const { protect } = require('../middleware/auth');

router.get('/', protect, getMatches);
router.post('/accept', protect, acceptMatch);
router.post('/reject', protect, rejectMatch);

module.exports = router;
