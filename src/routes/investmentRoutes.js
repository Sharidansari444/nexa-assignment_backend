const express = require('express');
const router = express.Router();
const {
  getPlans,
  createInvestment,
  getUserInvestments,
} = require('../controllers/investmentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/plans', getPlans);
router.post('/', protect, createInvestment);
router.get('/', protect, getUserInvestments);

module.exports = router;
