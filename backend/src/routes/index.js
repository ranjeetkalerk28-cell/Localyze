const express = require('express');
const router = express.Router();

router.use('/business/auth', require('./businessAuthRoutes'));
router.use('/user/auth', require('./userAuthRoutes'));
router.use('/posts', require('./postRoutes'));
router.use('/collaborations', require('./collaborationRoutes'));
router.use('/discover', require('./discoverRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/follows', require('./followRoutes'));
router.use('/connections', require('./connectionRoutes'));
router.use('/businesses', require('./businessRoutes'));
router.use('/stories', require('./storyRoutes'));
router.use('/uploads', require('./uploadRoutes'));
router.use('/meta', require('./metaRoutes'));

module.exports = router;
