const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMyProfile, updateMyProfile } = require('../controllers/userAuthController');
const { updateCurrentLocation, changePassword, deleteAccount } = require('../controllers/accountController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, requireRole('user'), getMyProfile);
router.put('/me', protect, requireRole('user'), updateMyProfile);
router.delete('/me', protect, requireRole('user'), deleteAccount);
router.put('/location', protect, requireRole('user'), updateCurrentLocation);
router.put('/password', protect, requireRole('user'), changePassword);

module.exports = router;
