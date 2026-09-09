const multer = require('multer');

const storage = multer.memoryStorage();

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Wraps multer so file-type/size rejections come back as 400s instead of
// falling through to the generic error handler's 500 default.
const uploadSingleImage = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (error) return res.status(400).json({ message: error.message });
    next();
  });
};

module.exports = uploadSingleImage;
