const Investment = require('../models/Investment');
const User = require('../models/User');
const ROIHistory = require('../models/ROIHistory');
const logger = require('../utils/logger');

/**
 * Format a Date to 'YYYY-MM-DD'
 */
const formatDateString = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

/**
 * Idempotent Daily ROI Processor
 * @param {Date} executionDate - Date for which ROI is processed (defaults to now)
 * @returns {Object} runReport - Summary of processed, credited, skipped, and completed investments
 */
const processDailyRoi = async (executionDate = new Date()) => {
  const dateString = formatDateString(executionDate);
  logger.info(`🔄 [ROI Engine] Starting Daily ROI processing for date: ${dateString}`);

  const report = {
    date: dateString,
    totalActiveInvestmentsFound: 0,
    successfullyCreditedCount: 0,
    skippedDuplicateCount: 0,
    completedInvestmentsCount: 0,
    totalRoiAmountDistributed: 0,
    details: [],
  };

  try {
    // 1. Fetch all active investments
    const activeInvestments = await Investment.find({
      investmentStatus: 'Active',
      startDate: { $lte: executionDate },
    }).populate('user', 'fullName email walletBalance accountStatus');

    report.totalActiveInvestmentsFound = activeInvestments.length;

    for (const inv of activeInvestments) {
      // Skip if associated user is missing or not active
      if (!inv.user || inv.user.accountStatus !== 'Active') {
        logger.warn(`[ROI Engine] Skipping investment ${inv._id}: User inactive or missing`);
        continue;
      }

      // 2. IDEMPOTENCY CHECK: Check if ROI was already credited today for this investment
      const alreadyCredited = await ROIHistory.findOne({
        investment: inv._id,
        dateString: dateString,
      });

      if (alreadyCredited) {
        report.skippedDuplicateCount++;
        report.details.push({
          investmentId: inv._id,
          user: inv.user.email,
          status: 'SKIPPED_ALREADY_CREDITED',
          roiAmount: alreadyCredited.roiAmount,
        });
        logger.debug(
          `[ROI Engine] Idempotency guard: ROI for investment ${inv._id} already exists for ${dateString}. Skipping.`
        );
        continue;
      }

      // 3. Calculate daily ROI amount
      const dailyRoiAmount = parseFloat(
        ((inv.amount * inv.dailyRoiPercentage) / 100).toFixed(2)
      );

      try {
        // 4. Create ROI history record with unique compound index guarantee
        const roiRecord = await ROIHistory.create({
          user: inv.user._id,
          investment: inv._id,
          roiAmount: dailyRoiAmount,
          date: executionDate,
          dateString: dateString,
          status: 'Credited',
        });

        // 5. Atomically update User wallet balance and total ROI earned
        await User.findByIdAndUpdate(inv.user._id, {
          $inc: {
            walletBalance: dailyRoiAmount,
            totalRoiEarned: dailyRoiAmount,
          },
        });

        // 6. Update investment total credited amount
        inv.totalRoiCredited = (inv.totalRoiCredited || 0) + dailyRoiAmount;

        // 7. Check if investment duration has completed (endDate reached)
        let isNowCompleted = false;
        if (new Date(inv.endDate) <= executionDate) {
          inv.investmentStatus = 'Completed';
          isNowCompleted = true;
          report.completedInvestmentsCount++;
        }

        await inv.save();

        report.successfullyCreditedCount++;
        report.totalRoiAmountDistributed = parseFloat(
          (report.totalRoiAmountDistributed + dailyRoiAmount).toFixed(2)
        );

        report.details.push({
          investmentId: inv._id,
          user: inv.user.email,
          roiAmount: dailyRoiAmount,
          status: isNowCompleted ? 'CREDITED_AND_COMPLETED' : 'CREDITED',
        });

        logger.info(
          `[ROI Engine] Credited $${dailyRoiAmount} to ${inv.user.email} (Investment: ${inv._id})`
        );
      } catch (err) {
        // Catch duplicate key race condition if 2 crons fired at identical millisecond
        if (err.code === 11000) {
          report.skippedDuplicateCount++;
          logger.warn(`[ROI Engine] Concurrency duplicate caught for investment ${inv._id}`);
        } else {
          logger.error(`[ROI Engine] Failed processing investment ${inv._id}: ${err.message}`);
        }
      }
    }

    logger.info(
      `✅ [ROI Engine] Finished daily ROI processing for ${dateString}. Credited: ${report.successfullyCreditedCount}, Skipped: ${report.skippedDuplicateCount}, Total Distributed: $${report.totalRoiAmountDistributed}`
    );

    return report;
  } catch (error) {
    logger.error(`[ROI Engine] Critical error in processDailyRoi: ${error.message}`);
    throw error;
  }
};

module.exports = {
  processDailyRoi,
  formatDateString,
};
