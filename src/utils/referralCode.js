const crypto = require('crypto');

/**
 * Generate a unique 8-character uppercase alphanumeric referral code
 * e.g., NEXA7A2B
 */
const generateReferralCode = (prefix = 'NEXA') => {
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars
  return `${prefix}${randomChars}`;
};

module.exports = { generateReferralCode };
