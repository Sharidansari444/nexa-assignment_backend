const cron = require('node-cron');
const { processDailyRoi } = require('../services/roiService');
const logger = require('../utils/logger');

/**
 * Initialize daily automated ROI Cron Job
 * Runs every day at 12:00 AM (midnight)
 */
const initRoiCron = () => {
  // Cron syntax: minute hour day-of-month month day-of-week
  // '0 0 * * *' = Exactly midnight every day
  cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ [Cron Job] Midnight ROI Scheduler triggered automatically...');
    try {
      const report = await processDailyRoi();
      logger.info(
        `⏰ [Cron Job] Completed successfully: Distributed $${report.totalRoiAmountDistributed} across ${report.successfullyCreditedCount} investments.`
      );
    } catch (error) {
      logger.error(`❌ [Cron Job] Failed during scheduled execution: ${error.message}`);
    }
  });

  logger.info('🕒 Automated Daily ROI Cron Job scheduled for 12:00 AM every day.');
};

module.exports = { initRoiCron };
