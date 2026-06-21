const express = require('express');
const router = express.Router();
const { getAdminUsers, getAdminReports, getAdminSessions, getAdminReviews, getStats, blockUser, unblockUser, deleteUser } = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get('/users', getAdminUsers);
router.get('/reports', getAdminReports);
router.get('/sessions', getAdminSessions);
router.get('/reviews', getAdminReviews);
router.get('/stats', getStats);
router.put('/block-user/:id', blockUser);
router.put('/unblock-user/:id', unblockUser);
router.delete('/user/:id', deleteUser);

module.exports = router;
