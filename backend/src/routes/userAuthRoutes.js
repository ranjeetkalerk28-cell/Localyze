const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMyProfile, updateMyProfile } = require('../controllers/userAuthController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, requireRole('user'), getMyProfile);
router.put('/me', protect, requireRole('user'), updateMyProfile);

module.exports = router;
