const express = require('express');
const router = express.Router();
const {
  triggerRoiDistribution,
  getAdminStats,
  getAllUsers,
  toggleUserStatus,
  getAllInvestments,
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All admin routes require authentication and 'admin' role
router.use(protect);
router.use(restrictTo('admin'));

router.post('/trigger-roi', triggerRoiDistribution);
router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.get('/investments', getAllInvestments);

module.exports = router;
