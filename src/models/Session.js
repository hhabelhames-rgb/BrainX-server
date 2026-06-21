const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skill: {
      type: String,
      required: [true, 'Skill is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Session date is required'],
    },
    duration: {
      type: Number, // minutes
      required: true,
      enum: [30, 45, 60, 90, 120],
      default: 60,
    },
    meetingLink: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    reviewLeft: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ teacher: 1, status: 1 });
sessionSchema.index({ learner: 1, status: 1 });
sessionSchema.index({ date: 1 });

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;
