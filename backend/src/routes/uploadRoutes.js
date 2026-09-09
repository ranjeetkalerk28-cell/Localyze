const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const uploadSingleImage = require('../middleware/uploadMiddleware');

// Any logged-in account can upload an image (post images are business-only,
// but that's enforced by createPost's own route, not here — this endpoint
// just uploads bytes and hands back a URL; profile photos need both roles).
router.post('/image', protect, uploadSingleImage, uploadImage);

module.exports = router;
