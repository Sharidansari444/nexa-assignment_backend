const ROIHistory = require('../models/ROIHistory');

// @desc    Get authenticated user's complete ROI credit history
// @route   GET /api/roi/history
// @access  Private
const getUserRoiHistory = async (req, res, next) => {
  try {
    const history = await ROIHistory.find({ user: req.user._id })
      .populate('investment', 'planDetails amount dailyRoiPercentage startDate endDate')
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
  getUserRoiHistory,
};
