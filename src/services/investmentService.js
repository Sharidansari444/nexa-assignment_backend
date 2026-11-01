const Investment = require('../models/Investment');
const { distributeLevelCommissions } = require('./referralService');
const logger = require('../utils/logger');

// Available Investment Plans definition
const INVESTMENT_PLANS = [
  {
    planId: 'starter-plan',
    name: 'Starter Yield Plan',
    dailyRoiPercentage: 1.5,
    durationDays: 30,
    minAmount: 50,
    maxAmount: 500,
    description: '1.5% Daily ROI for 30 days. Perfect for starters and testing.',
  },
  {
    planId: 'growth-plan',
    name: 'Growth Alpha Plan',
    dailyRoiPercentage: 2.0,
    durationDays: 45,
    minAmount: 500,
    maxAmount: 2000,
    description: '2.0% Daily ROI for 45 days with elevated multi-level yields.',
  },
  {
    planId: 'elite-plan',
    name: 'Elite Institutional Plan',
    dailyRoiPercentage: 2.5,
    durationDays: 60,
    minAmount: 2000,
    maxAmount: 10000,
    description: '2.5% Daily ROI for 60 days for high-volume investors.',
  },
];

/**
 * Get all available investment packages
 */
const getAvailablePlans = () => INVESTMENT_PLANS;

/**
 * Create a new investment and trigger referral level income
 */
const createInvestmentPackage = async (userId, planId, amount) => {
  const plan = INVESTMENT_PLANS.find((p) => p.planId === planId);

  if (!plan) {
    throw new Error(`Invalid plan selected: '${planId}'`);
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount < plan.minAmount || numAmount > plan.maxAmount) {
    throw new Error(
      `Investment amount for ${plan.name} must be between $${plan.minAmount} and $${plan.maxAmount}`
    );
  }

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const investment = await Investment.create({
    user: userId,
    amount: numAmount,
    planDetails: {
      planId: plan.planId,
      name: plan.name,
      durationDays: plan.durationDays,
      description: plan.description,
    },
    startDate,
    endDate,
    dailyRoiPercentage: plan.dailyRoiPercentage,
    investmentStatus: 'Active',
  });

  logger.info(`New investment created: ${investment._id} ($${numAmount}) for user: ${userId}`);

  // Trigger Multi-Level Referral distribution
  const commissionSummary = await distributeLevelCommissions(userId, numAmount, investment._id);

  return {
    investment,
    commissionSummary,
  };
};

module.exports = {
  INVESTMENT_PLANS,
  getAvailablePlans,
  createInvestmentPackage,
};
