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
const { getComments, addComment } = require('../controllers/commentController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Business-only routes
router.post('/', protect, requireRole('business'), createPost);
router.get('/mine', protect, requireRole('business'), getMyPosts);
router.get('/feed', protect, requireRole('business'), getConnectionsFeed);
router.put('/:id', protect, requireRole('business'), updatePost);
router.delete('/:id', protect, requireRole('business'), deletePost);

// Shared (any logged-in account can like/comment, view a single post, or read its comments)
router.put('/:id/like', protect, toggleLikePost);
router.post('/:id/comments', protect, addComment);
router.get('/:id/comments', protect, getComments);
router.get('/:id', protect, getPostById);

module.exports = router;
