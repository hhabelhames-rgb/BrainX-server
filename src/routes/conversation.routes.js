const express = require('express');
const router = express.Router();
const { getConversations, createOrGetConversation, createSupportConversation } = require('../controllers/conversation.controller');
const { protect } = require('../middleware/auth');

router.get('/', protect, getConversations);
router.post('/support', protect, createSupportConversation);
router.post('/', protect, createOrGetConversation);

module.exports = router;
