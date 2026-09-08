const express = require('express');
const router = express.Router();
const {
  createPost,
  getMyPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
  getConnectionsFeed,
} = require('../controllers/postController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Business-only routes
router.post('/', protect, requireRole('business'), createPost);
router.get('/mine', protect, requireRole('business'), getMyPosts);
router.get('/feed', protect, requireRole('business'), getConnectionsFeed);
router.put('/:id', protect, requireRole('business'), updatePost);
router.delete('/:id', protect, requireRole('business'), deletePost);

// User-only route
router.put('/:id/like', protect, requireRole('user'), toggleLikePost);

// Shared (any logged-in account can view a single post)
router.get('/:id', protect, getPostById);

module.exports = router;
