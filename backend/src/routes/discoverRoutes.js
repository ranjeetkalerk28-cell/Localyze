const express = require('express');
const router = express.Router();
const { discoverPosts, discoverExplore, discoverBusinesses } = require('../controllers/discoverController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/explore', discoverExplore);

router.use(requireRole('user'));
router.get('/posts', discoverPosts);
router.get('/businesses', discoverBusinesses);

module.exports = router;
