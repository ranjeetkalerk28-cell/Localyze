const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMyProfile } = require('../controllers/userAuthController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, requireRole('user'), getMyProfile);

module.exports = router;
