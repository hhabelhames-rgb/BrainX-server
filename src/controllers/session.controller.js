const Session = require('../models/Session');
const User = require('../models/User');
const { generateMeetingLink } = require('../services/jitsiService');
const { createNotification, notifTemplates } = require('../services/notifService');
const { sendEmail, sessionConfirmationTemplate } = require('../services/emailService');
const { success, created, notFound, error } = require('../utils/apiResponse');

// ─── Create Session (Learner requests) ───────────────────────────────────────
const createSession = async (req, res, next) => {
  try {
    const { teacherId, skill, date, duration, notes } = req.body;

    if (teacherId === req.user._id.toString()) {
      return error(res, 'You cannot book a session with yourself', 400);
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.isBlocked) return notFound(res, 'Teacher not found');

    const session = await Session.create({
      teacher: teacherId,
      learner: req.user._id,
      skill,
      date: new Date(date),
      duration: parseInt(duration),
      notes: notes || '',
    });

    await session.populate([
      { path: 'teacher', select: 'fullName avatar email' },
      { path: 'learner', select: 'fullName avatar email' },
    ]);

    // Notify teacher
    const io = req.app.get('io');
    const tmpl = notifTemplates.session_requested(req.user.fullName, skill);
    await createNotification(io, {
      userId: teacherId,
      type: 'session_requested',
      ...tmpl,
      senderId: req.user._id,
    });

    return created(res, { session }, 'Session requested');
  } catch (err) {
    next(err);
  }
};

// ─── Get Sessions ─────────────────────────────────────────────────────────────
const getSessions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {
      $or: [{ teacher: req.user._id }, { learner: req.user._id }],
    };
    if (status) filter.status = status;

    const sessions = await Session.find(filter)
      .populate('teacher', 'fullName avatar email')
      .populate('learner', 'fullName avatar email')
      .sort({ date: 1 });

    return success(res, { sessions });
  } catch (err) {
    next(err);
  }
};

// ─── Accept Session ───────────────────────────────────────────────────────────
const acceptSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('teacher', 'fullName email')
      .populate('learner', 'fullName email');

    if (!session) return notFound(res, 'Session not found');

    if (session.teacher._id.toString() !== req.user._id.toString()) {
      return error(res, 'Only the teacher can accept this session', 403);
    }

    if (session.status !== 'pending') {
      return error(res, `Session is already ${session.status}`, 400);
    }

    // Generate Jitsi meeting link
    const meetingLink = generateMeetingLink(session._id.toString());
    session.status = 'confirmed';
    session.meetingLink = meetingLink;
    await session.save();

    // Notify learner
    const io = req.app.get('io');
    const tmpl = notifTemplates.session_accepted(req.user.fullName, session.skill);
    await createNotification(io, {
      userId: session.learner._id,
      type: 'session_accepted',
      ...tmpl,
      senderId: req.user._id,
    });

    // Send confirmation email to both
    try {
      const { subject: s1, html: h1 } = sessionConfirmationTemplate(session.learner.fullName, session, session.teacher);
      await sendEmail({ to: session.learner.email, subject: s1, html: h1 });
      const { subject: s2, html: h2 } = sessionConfirmationTemplate(session.teacher.fullName, session, session.learner);
      await sendEmail({ to: session.teacher.email, subject: s2, html: h2 });
    } catch (emailErr) {
      console.error('Session confirmation email failed:', emailErr.message);
    }

    return success(res, { session }, 'Session confirmed');
  } catch (err) {
    next(err);
  }
};

// ─── Cancel / Refuse Session ─────────────────────────────────────────────────
const cancelSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return notFound(res, 'Session not found');

    const isTeacher = session.teacher.toString() === req.user._id.toString();
    const isLearner = session.learner.toString() === req.user._id.toString();

    if (!isTeacher && !isLearner) return error(res, 'Not authorized', 403);

    if (['completed', 'cancelled'].includes(session.status)) {
      return error(res, `Cannot cancel a ${session.status} session`, 400);
    }

    // If the teacher is refusing a pending request → delete it entirely
    if (isTeacher && session.status === 'pending') {
      // Notify learner that request was refused
      const io = req.app.get('io');
      await session.populate([{ path: 'learner', select: 'fullName' }]);
      const tmpl = notifTemplates.session_cancelled(req.user.fullName, session.skill);
      await createNotification(io, {
        userId: session.learner._id,
        type: 'session_cancelled',
        message: `${req.user.fullName} refused your session request for ${session.skill}`,
        senderId: req.user._id,
      });
      await session.deleteOne();
      return success(res, {}, 'Session request refused and removed');
    }

    // Otherwise cancel it normally (learner cancelling, or cancelling confirmed session)
    session.status = 'cancelled';
    session.cancellationReason = req.body.reason || '';
    await session.save();

    await session.populate([
      { path: 'teacher', select: 'fullName' },
      { path: 'learner', select: 'fullName' },
    ]);

    // Notify the other participant
    const io = req.app.get('io');
    const otherUserId =
      session.teacher._id.toString() === req.user._id.toString()
        ? session.learner._id
        : session.teacher._id;

    const tmpl = notifTemplates.session_cancelled(req.user.fullName, session.skill);
    await createNotification(io, {
      userId: otherUserId,
      type: 'session_cancelled',
      ...tmpl,
      senderId: req.user._id,
    });

    return success(res, { session }, 'Session cancelled');
  } catch (err) {
    next(err);
  }
};

// ─── Complete Session ─────────────────────────────────────────────────────────
const completeSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('teacher', 'fullName')
      .populate('learner', 'fullName');

    if (!session) return notFound(res, 'Session not found');

    if (session.teacher._id.toString() !== req.user._id.toString()) {
      return error(res, 'Only the teacher can mark a session complete', 403);
    }

    if (session.status !== 'confirmed') {
      return error(res, 'Session must be confirmed before completion', 400);
    }

    session.status = 'completed';
    await session.save();

    // Increment completedExchanges for both users
    await User.updateMany(
      { _id: { $in: [session.teacher._id, session.learner._id] } },
      { $inc: { completedExchanges: 1 } }
    );

    // Notify learner they can leave a review
    const io = req.app.get('io');
    const tmpl = notifTemplates.session_completed(session.skill);
    await createNotification(io, {
      userId: session.learner._id,
      type: 'session_completed',
      ...tmpl,
      senderId: req.user._id,
    });

    return success(res, { session }, 'Session marked as completed');
  } catch (err) {
    next(err);
  }
};

// ─── Delete Session ───────────────────────────────────────────────────────────
const deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return notFound(res, 'Session not found');

    const isParticipant =
      session.teacher.toString() === req.user._id.toString() ||
      session.learner.toString() === req.user._id.toString();

    if (!isParticipant && !req.user.isAdmin) return error(res, 'Not authorized', 403);

    await session.deleteOne();
    return success(res, {}, 'Session deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { createSession, getSessions, acceptSession, cancelSession, completeSession, deleteSession };
