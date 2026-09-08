const express = require('express');
const router = express.Router();
const { getNotifications, markNotificationRead } = require('../controllers/notificationController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.use(protect, requireRole('user'));
router.get('/', getNotifications);
router.put('/:id/read', markNotificationRead);

module.exports = router;
