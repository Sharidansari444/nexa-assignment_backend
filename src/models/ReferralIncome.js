const mongoose = require('mongoose');

const referralIncomeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver user reference is required'],
      index: true,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Generator user reference is required'],
      index: true,
    },
    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
      required: [true, 'Investment reference is required'],
      index: true,
    },
    level: {
      type: Number,
      required: [true, 'Referral level is required'],
      min: [1, 'Referral level must be at least 1'],
    },
    commissionPercentage: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Income amount is required'],
      min: [0, 'Income amount cannot be negative'],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user queries and reporting
referralIncomeSchema.index({ user: 1, date: -1 });
referralIncomeSchema.index({ user: 1, level: 1 });

const ReferralIncome = mongoose.model('ReferralIncome', referralIncomeSchema);
module.exports = ReferralIncome;
