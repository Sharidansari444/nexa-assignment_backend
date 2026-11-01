const User = require('../models/User');
const logger = require('./logger');

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Nexa Super Admin';
    const adminMobile = process.env.ADMIN_MOBILE || '9999999999';

    if (!adminEmail || !adminPassword) {
      logger.warn('ADMIN_EMAIL or ADMIN_PASSWORD not specified in .env. Skipping admin auto-seed.');
      return;
    }

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (!existingAdmin) {
      const adminUser = new User({
        fullName: adminName,
        email: adminEmail.toLowerCase(),
        mobile: adminMobile,
        password: adminPassword, // pre-save hook will hash it with bcrypt
        role: 'admin',
        walletBalance: 0,
        accountStatus: 'Active',
      });

      await adminUser.save();
      logger.info(`✅ Super Admin auto-seeded successfully: ${adminEmail}`);
    } else {
      logger.info(`ℹ️ Super Admin account already verified: ${adminEmail}`);
    }
  } catch (error) {
    logger.error(`❌ Error in seedAdmin: ${error.message}`);
  }
};

module.exports = seedAdmin;
