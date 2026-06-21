const express = require('express');
const router = express.Router();
const { getMessages, sendMessage } = require('../controllers/message.controller');
const { protect } = require('../middleware/auth');

router.get('/:conversationId', protect, getMessages);
router.post('/', protect, sendMessage);

module.exports = router;
