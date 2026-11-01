const express = require('express');
const router = express.Router();
const {
  getDirectReferrals,
  getReferralTree,
  getReferralHistory,
} = require('../controllers/referralController');
const { protect } = require('../middleware/authMiddleware');

router.get('/direct', protect, getDirectReferrals);
router.get('/tree', protect, getReferralTree);
router.get('/history', protect, getReferralHistory);

module.exports = router;
