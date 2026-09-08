const express = require('express');
const router = express.Router();
const { registerBusiness, loginBusiness, getMyProfile } = require('../controllers/businessAuthController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.post('/register', registerBusiness);
router.post('/login', loginBusiness);
router.get('/me', protect, requireRole('business'), getMyProfile);

module.exports = router;
