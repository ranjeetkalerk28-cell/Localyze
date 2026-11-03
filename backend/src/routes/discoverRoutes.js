const express = require('express');
const router = express.Router();
const { discoverPosts, discoverExplore, discoverBusinesses } = require('../controllers/discoverController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// All discover routes are user-only
router.use(protect, requireRole('user'));

router.get('/posts', discoverPosts);
router.get('/explore', discoverExplore);
router.get('/businesses', discoverBusinesses);

module.exports = router;
