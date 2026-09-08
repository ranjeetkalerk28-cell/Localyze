const express = require('express');
const router = express.Router();
const {
  followBusiness,
  unfollowBusiness,
  getFollowStatus,
  getFollowingBusinesses,
} = require('../controllers/followController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.use(protect, requireRole('user'));
router.get('/', getFollowingBusinesses);
router.get('/:businessId/status', getFollowStatus);
router.post('/:businessId', followBusiness);
router.delete('/:businessId', unfollowBusiness);

module.exports = router;
