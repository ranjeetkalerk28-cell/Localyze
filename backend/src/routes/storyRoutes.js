const express = require('express');
const router = express.Router();
const { getStories } = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getStories);

module.exports = router;
