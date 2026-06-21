const express = require('express');
const router = express.Router();
const { createReport, getReports, updateReport } = require('../controllers/report.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', protect, createReport);
router.get('/', protect, adminOnly, getReports);
router.put('/:id', protect, adminOnly, updateReport);

module.exports = router;
