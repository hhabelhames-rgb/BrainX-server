const express = require('express');
const router = express.Router();
const { createSession, getSessions, acceptSession, cancelSession, completeSession, deleteSession } = require('../controllers/session.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createSessionValidators } = require('../validators/session.validators');

router.post('/', protect, createSessionValidators, validate, createSession);
router.get('/', protect, getSessions);
router.put('/:id/accept', protect, acceptSession);
router.put('/:id/cancel', protect, cancelSession);
router.put('/:id/complete', protect, completeSession);
router.delete('/:id', protect, deleteSession);

module.exports = router;
