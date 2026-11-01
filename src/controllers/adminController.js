const User = require('../models/User');
const Investment = require('../models/Investment');
const ROIHistory = require('../models/ROIHistory');
const ReferralIncome = require('../models/ReferralIncome');
const { processDailyRoi } = require('../services/roiService');
const logger = require('../utils/logger');

// @desc    Trigger Daily ROI processing immediately (Idempotent demo & test runner)
// @route   POST /api/admin/trigger-roi
// @access  Private (Admin Only)
const triggerRoiDistribution = async (req, res, next) => {
  try {
    const { customDate } = req.body;
    const targetDate = customDate ? new Date(customDate) : new Date();

    logger.info(`⚡ [Admin Action] Manual Daily ROI triggered by admin: ${req.user.email}`);
    const report = await processDailyRoi(targetDate);

    res.json({
      success: true,
      message: 'Daily ROI distribution run completed successfully.',
      report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform-wide admin metrics
// @route   GET /api/admin/stats
// @access  Private (Admin Only)
const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', accountStatus: 'Active' });

    // Aggregate total investment volume
    const investmentAgg = await Investment.aggregate([
      {
        $group: {
          _id: null,
          totalVolume: { $sum: '$amount' },
          activeVolume: {
            $sum: {
              $cond: [{ $eq: ['$investmentStatus', 'Active'] }, '$amount', 0],
            },
          },
          totalInvestmentsCount: { $sum: 1 },
          activeInvestmentsCount: {
            $sum: {
              $cond: [{ $eq: ['$investmentStatus', 'Active'] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Aggregate total ROI distributed
    const roiAgg = await ROIHistory.aggregate([
      { $group: { _id: null, totalRoiDistributed: { $sum: '$roiAmount' } } },
    ]);

    // Aggregate total referral income distributed
    const refAgg = await ReferralIncome.aggregate([
      { $group: { _id: null, totalReferralDistributed: { $sum: '$amount' } } },
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      totalVolume: investmentAgg[0]?.totalVolume || 0,
      activeVolume: investmentAgg[0]?.activeVolume || 0,
      totalInvestmentsCount: investmentAgg[0]?.totalInvestmentsCount || 0,
      activeInvestmentsCount: investmentAgg[0]?.activeInvestmentsCount || 0,
      totalRoiDistributed: roiAgg[0]?.totalRoiDistributed || 0,
      totalReferralDistributed: refAgg[0]?.totalReferralDistributed || 0,
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users list with pagination and search
// @route   GET /api/admin/users
// @access  Private (Admin Only)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('referredBy', 'fullName email referralCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user status (Active / Suspended)
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin Only)
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot modify Super Admin account.' });
    }

    user.accountStatus = user.accountStatus === 'Active' ? 'Suspended' : 'Active';
    await user.save();

    logger.info(`User ${user.email} status updated to: ${user.accountStatus} by admin`);

    res.json({
      success: true,
      message: `User status changed to ${user.accountStatus}`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all platform investments
// @route   GET /api/admin/investments
// @access  Private (Admin Only)
const getAllInvestments = async (req, res, next) => {
  try {
    const investments = await Investment.find()
      .populate('user', 'fullName email referralCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: investments.length,
      investments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerRoiDistribution,
  getAdminStats,
  getAllUsers,
  toggleUserStatus,
  getAllInvestments,
};
