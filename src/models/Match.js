const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    compatibilityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    matchingSkills: {
      // Skills that create the match: [{userTeaches, otherWants}]
      type: [
        {
          skill: String,
          direction: { type: String, enum: ['user1_teaches', 'user2_teaches'] },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Prevent duplicate matches
matchSchema.index({ user1: 1, user2: 1 }, { unique: true });
matchSchema.index({ status: 1 });

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;
