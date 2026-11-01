const User = require('../models/User');
const Investment = require('../models/Investment');
const ROIHistory = require('../models/ROIHistory');
const ReferralIncome = require('../models/ReferralIncome');

// @desc    Get consolidated user dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Refresh user document for most up-to-date wallet and income totals
    const user = await User.findById(userId);

    // 1. Calculate Total Investments amount & active count
    const investments = await Investment.find({ user: userId });
    const totalInvestments = investments.reduce((acc, curr) => acc + curr.amount, 0);
    const activeInvestments = investments.filter((i) => i.investmentStatus === 'Active');

    // 2. Daily expected ROI from currently active investments
    const dailyRoiRate = activeInvestments.reduce((acc, curr) => {
      return acc + (curr.amount * curr.dailyRoiPercentage) / 100;
    }, 0);

    // 3. Count direct referrals
    const directReferralsCount = await User.countDocuments({ referredBy: userId });

    // 4. Fetch recent 5 ROI history entries
    const recentRoi = await ROIHistory.find({ user: userId })
      .populate('investment', 'planDetails amount')
      .sort({ date: -1 })
      .limit(5);

    // 5. Fetch recent 5 Referral income entries
    const recentReferralIncome = await ReferralIncome.find({ user: userId })
      .populate('fromUser', 'fullName email')
      .sort({ date: -1 })
      .limit(5);

    // 6. Generate 7-day earnings chart series (ROI vs Referral)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pastSevenDaysRoi = await ROIHistory.find({
      user: userId,
      date: { $gte: sevenDaysAgo },
    });

    const pastSevenDaysReferral = await ReferralIncome.find({
      user: userId,
      date: { $gte: sevenDaysAgo },
    });

    // Group earnings by date for chart
    const chartMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      chartMap[key] = { date: key, roi: 0, referral: 0, total: 0 };
    }

    pastSevenDaysRoi.forEach((item) => {
      const key = item.dateString || item.date.toISOString().split('T')[0];
      if (chartMap[key]) {
        chartMap[key].roi = parseFloat((chartMap[key].roi + item.roiAmount).toFixed(2));
        chartMap[key].total = parseFloat((chartMap[key].total + item.roiAmount).toFixed(2));
      }
    });

    pastSevenDaysReferral.forEach((item) => {
      const key = item.date.toISOString().split('T')[0];
      if (chartMap[key]) {
        chartMap[key].referral = parseFloat((chartMap[key].referral + item.amount).toFixed(2));
        chartMap[key].total = parseFloat((chartMap[key].total + item.amount).toFixed(2));
      }
    });

    const earningsChartData = Object.values(chartMap);

    res.json({
      success: true,
      stats: {
        totalInvestments: parseFloat(totalInvestments.toFixed(2)),
        totalRoiEarned: parseFloat(user.totalRoiEarned.toFixed(2)),
        totalLevelIncomeEarned: parseFloat(user.totalLevelIncomeEarned.toFixed(2)),
        walletBalance: parseFloat(user.walletBalance.toFixed(2)),
        activeInvestmentsCount: activeInvestments.length,
        dailyRoiRate: parseFloat(dailyRoiRate.toFixed(2)),
        directReferralsCount,
        referralCode: user.referralCode,
      },
      chartData: earningsChartData,
      recentActivity: {
        recentRoi,
        recentReferralIncome,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
