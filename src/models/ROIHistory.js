const mongoose = require('mongoose');

const roiHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
      required: [true, 'Investment reference is required'],
      index: true,
    },
    roiAmount: {
      type: Number,
      required: [true, 'ROI amount is required'],
      min: [0, 'ROI amount cannot be negative'],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // YYYY-MM-DD format date string for strict idempotency enforcement
    dateString: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Credited', 'Pending', 'Failed'],
      default: 'Credited',
    },
  },
  {
    timestamps: true,
  }
);

// Idempotency: Exactly one ROI credit per investment per calendar day
roiHistorySchema.index({ investment: 1, dateString: 1 }, { unique: true });
roiHistorySchema.index({ user: 1, date: -1 });

const ROIHistory = mongoose.model('ROIHistory', roiHistorySchema);
module.exports = ROIHistory;
