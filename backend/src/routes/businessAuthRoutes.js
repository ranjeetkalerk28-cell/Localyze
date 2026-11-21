const express = require('express');
const router = express.Router();
const { registerBusiness, loginBusiness, getMyProfile, updateMyProfile } = require('../controllers/businessAuthController');
const { updateCurrentLocation, changePassword, deleteAccount } = require('../controllers/accountController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.post('/register', registerBusiness);
router.post('/login', loginBusiness);
router.get('/me', protect, requireRole('business'), getMyProfile);
router.put('/me', protect, requireRole('business'), updateMyProfile);
router.delete('/me', protect, requireRole('business'), deleteAccount);
router.put('/location', protect, requireRole('business'), updateCurrentLocation);
router.put('/password', protect, requireRole('business'), changePassword);

module.exports = router;
