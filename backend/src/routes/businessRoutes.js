const express = require('express');
const router = express.Router();
const { searchBusinesses, getBusinessById, getBusinessFollowers, getBusinessConnections, getBusinessPosts } = require('../controllers/businessController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', protect, searchBusinesses);
router.get('/:id', protect, getBusinessById);
router.get('/:id/followers', protect, getBusinessFollowers);
router.get('/:id/connections', protect, getBusinessConnections);
router.get('/:id/posts', protect, getBusinessPosts);

module.exports = router;
