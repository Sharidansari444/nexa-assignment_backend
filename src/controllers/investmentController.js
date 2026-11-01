const Investment = require('../models/Investment');
const { getAvailablePlans, createInvestmentPackage } = require('../services/investmentService');

// @desc    Get all available investment plans
// @route   GET /api/investments/plans
// @access  Public / Private
const getPlans = async (req, res, next) => {
  try {
    const plans = getAvailablePlans();
    res.json({ success: true, plans });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new investment package & trigger multi-level referral commission
// @route   POST /api/investments
// @access  Private
const createInvestment = async (req, res, next) => {
  try {
    const { planId, amount } = req.body;

    if (!planId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide planId and amount.',
      });
    }

    const result = await createInvestmentPackage(req.user._id, planId, amount);

    res.status(201).json({
      success: true,
      message: 'Investment activated successfully! Referral commissions distributed.',
      investment: result.investment,
      commissionSummary: result.commissionSummary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    View user's investments
// @route   GET /api/investments
// @access  Private
const getUserInvestments = async (req, res, next) => {
  try {
    const investments = await Investment.find({ user: req.user._id })
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
  getPlans,
  createInvestment,
  getUserInvestments,
};
