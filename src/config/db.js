
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });

    logger.info(
      `MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`
    );

    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
