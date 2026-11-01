require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedAdmin = require('./utils/seedAdmin');
const { initRoiCron } = require('./cron/roiCron');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION! Shutting down... ${err.message}`, { stack: err.stack });
  process.exit(1);
});

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Auto-seed Admin account from .env credentials (Zero hardcoding)
    await seedAdmin();

    // 3. Initialize Automated node-cron Scheduler
    initRoiCron();

    // 4. Start HTTP Server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 NexaChain API server running in [${process.env.NODE_ENV || 'development'}] mode on port ${PORT}`);
    });

    // Catch unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error(`UNHANDLED REJECTION! Shutting down... ${err.message}`, { stack: err.stack });
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    logger.error(`Server startup failure: ${error.message}`);
    process.exit(1);
  }
};

startServer();
