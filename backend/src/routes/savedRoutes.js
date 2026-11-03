const express = require('express');
const router = express.Router();
const { savePost, unsavePost, getSavedPosts } = require('../controllers/savedPostController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// All saved-post routes are user-only
router.use(protect, requireRole('user'));

router.get('/', getSavedPosts);
router.post('/:postId', savePost);
router.delete('/:postId', unsavePost);

module.exports = router;
