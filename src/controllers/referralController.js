const User = require('../models/User');
const ReferralIncome = require('../models/ReferralIncome');
const { buildReferralTree } = require('../services/referralService');

// @desc    Fetch direct referrals (Level 1)
// @route   GET /api/referrals/direct
// @access  Private
const getDirectReferrals = async (req, res, next) => {
  try {
    const directReferrals = await User.find({ referredBy: req.user._id })
      .select('fullName email mobile referralCode accountStatus createdAt walletBalance totalRoiEarned')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: directReferrals.length,
      referrals: directReferrals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch complete nested referral tree
// @route   GET /api/referrals/tree
// @access  Private
const getReferralTree = async (req, res, next) => {
  try {
    const maxDepth = parseInt(req.query.depth) || 5;
    const tree = await buildReferralTree(req.user._id, 1, maxDepth);

    // Root node representation of current user
    const rootNode = {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      referralCode: req.user.referralCode,
      level: 0,
      totalDirectDownlines: tree.length,
      children: tree,
    };

    res.json({
      success: true,
      tree: rootNode,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch referral income transaction history
// @route   GET /api/referrals/history
// @access  Private
const getReferralHistory = async (req, res, next) => {
  try {
    const history = await ReferralIncome.find({ user: req.user._id })
      .populate('fromUser', 'fullName email referralCode')
      .populate('investment', 'amount planDetails')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDirectReferrals,
  getReferralTree,
  getReferralHistory,
};
