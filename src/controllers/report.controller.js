const Report = require('../models/Report');
const { success, created, notFound, error } = require('../utils/apiResponse');

// ─── Submit Report ────────────────────────────────────────────────────────────
const createReport = async (req, res, next) => {
  try {
    const { reportedUserId, reason, description } = req.body;

    if (reportedUserId === req.user._id.toString()) {
      return error(res, 'Cannot report yourself', 400);
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser: reportedUserId,
      reason,
      description: description || '',
    });

    return created(res, { report }, 'Report submitted. Our team will review it.');
  } catch (err) {
    next(err);
  }
};

// ─── Get Reports (Admin) ──────────────────────────────────────────────────────
const getReports = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const reports = await Report.find(filter)
      .populate('reporter', 'fullName email avatar')
      .populate('reportedUser', 'fullName email avatar')
      .sort({ createdAt: -1 });

    return success(res, { reports });
  } catch (err) {
    next(err);
  }
};

// ─── Update Report Status (Admin) ─────────────────────────────────────────────
const updateReport = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNote: adminNote || '',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate('reporter', 'fullName email')
      .populate('reportedUser', 'fullName email');

    if (!report) return notFound(res, 'Report not found');

    return success(res, { report }, 'Report updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { createReport, getReports, updateReport };
