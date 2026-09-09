const cloudinary = require('../config/cloudinary');

const allowedUploadTypes = { post: 'localyze/posts', profile: 'localyze/profiles' };

// @desc    Upload an image and return its hosted URL
// @route   POST /api/uploads/image
const uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image file provided' });

  const folder = allowedUploadTypes[req.query.type] || allowedUploadTypes.post;

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult))
      );
      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadImage };
