const express = require('express');
const router = express.Router();
const { getUserRoiHistory } = require('../controllers/roiController');
const { protect } = require('../middleware/authMiddleware');

router.get('/history', protect, getUserRoiHistory);

module.exports = router;
