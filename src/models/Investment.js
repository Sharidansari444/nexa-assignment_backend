const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Investment amount is required'],
      min: [10, 'Minimum investment amount is 10'],
    },
    planDetails: {
      planId: { type: String, required: true },
      name: { type: String, required: true },
      durationDays: { type: Number, required: true },
      description: { type: String },
    },
    startDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
    },
    dailyRoiPercentage: {
      type: Number,
      required: [true, 'Daily ROI percentage is required'],
      min: [0, 'Daily ROI percentage cannot be negative'],
    },
    totalRoiCredited: {
      type: Number,
      default: 0,
    },
    investmentStatus: {
      type: String,
      enum: ['Active', 'Completed', 'Cancelled'],
      default: 'Active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal query performance
investmentSchema.index({ user: 1, investmentStatus: 1 });
investmentSchema.index({ investmentStatus: 1, endDate: 1 });

const Investment = mongoose.model('Investment', investmentSchema);
module.exports = Investment;
