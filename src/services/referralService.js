const User = require('../models/User');
const ReferralIncome = require('../models/ReferralIncome');
const logger = require('../utils/logger');

/**
 * Multi-Level Referral Commission percentages from .env
 */
const getCommissionPercentages = () => {
  return [
    parseFloat(process.env.LEVEL_1_PERCENT || '5'),
    parseFloat(process.env.LEVEL_2_PERCENT || '3'),
    parseFloat(process.env.LEVEL_3_PERCENT || '2'),
    parseFloat(process.env.LEVEL_4_PERCENT || '1'),
    parseFloat(process.env.LEVEL_5_PERCENT || '0.5'),
  ];
};

/**
 * Distribute referral / level commission up the hierarchy
 * @param {ObjectId} investingUserId - User who made the investment
 * @param {Number} investmentAmount - Amount invested
 * @param {ObjectId} investmentId - The investment reference
 */
const distributeLevelCommissions = async (investingUserId, investmentAmount, investmentId) => {
  const levelPercentages = getCommissionPercentages();
  const maxLevels = levelPercentages.length;
  const distributions = [];

  try {
    let currentUserId = investingUserId;
    const investingUser = await User.findById(investingUserId);
    if (!investingUser) return distributions;

    // Traverse upwards from parent
    let parentId = investingUser.referredBy;

    for (let level = 1; level <= maxLevels && parentId; level++) {
      const parentUser = await User.findById(parentId);
      if (!parentUser) break;

      // Only distribute to Active parent accounts
      if (parentUser.accountStatus === 'Active') {
        const percentage = levelPercentages[level - 1];
        const commissionAmount = parseFloat(((investmentAmount * percentage) / 100).toFixed(2));

        if (commissionAmount > 0) {
          // Atomic balance & cumulative commission increment
          await User.findByIdAndUpdate(parentUser._id, {
            $inc: {
              walletBalance: commissionAmount,
              totalLevelIncomeEarned: commissionAmount,
            },
          });

          // Record in ReferralIncome model
          const incomeRecord = await ReferralIncome.create({
            user: parentUser._id,
            fromUser: investingUser._id,
            investment: investmentId,
            level: level,
            commissionPercentage: percentage,
            amount: commissionAmount,
            date: new Date(),
          });

          distributions.push({
            level,
            recipient: parentUser.email,
            percentage,
            amount: commissionAmount,
            incomeId: incomeRecord._id,
          });

          logger.info(
            `Level ${level} Commission: Credited $${commissionAmount} (${percentage}%) to ${parentUser.email} from ${investingUser.email}'s $${investmentAmount} investment`
          );
        }
      }

      // Move up to the next upline parent
      parentId = parentUser.referredBy;
    }

    return distributions;
  } catch (error) {
    logger.error(`Error in distributeLevelCommissions: ${error.message}`);
    throw error;
  }
};

/**
 * Recursively fetch complete referral tree downline
 * @param {ObjectId} userId - Root user to fetch tree for
 * @param {Number} currentDepth - Current tree depth
 * @param {Number} maxDepth - Max levels to traverse (default 5)
 */
const buildReferralTree = async (userId, currentDepth = 1, maxDepth = 5) => {
  if (currentDepth > maxDepth) return [];

  const directChildren = await User.find({ referredBy: userId })
    .select('fullName email mobile referralCode accountStatus createdAt walletBalance totalRoiEarned totalLevelIncomeEarned')
    .lean();

  const treeNodes = await Promise.all(
    directChildren.map(async (child) => {
      // Find sub-children recursively
      const subDownlines = await buildReferralTree(child._id, currentDepth + 1, maxDepth);

      return {
        id: child._id,
        fullName: child.fullName,
        email: child.email,
        referralCode: child.referralCode,
        accountStatus: child.accountStatus,
        createdAt: child.createdAt,
        level: currentDepth,
        totalDownlines: subDownlines.length,
        children: subDownlines,
      };
    })
  );

  return treeNodes;
};

module.exports = {
  distributeLevelCommissions,
  buildReferralTree,
  getCommissionPercentages,
};
