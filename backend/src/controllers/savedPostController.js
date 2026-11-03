const SavedPost = require('../models/SavedPost');
const Post = require('../models/Post');

// @desc    Save a post (user only)
// @route   POST /api/saved/:postId
const savePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findOne({ _id: postId, status: 'active' }).select('_id');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const saved = await SavedPost.create({ user: req.user._id, post: postId });
    res.status(201).json({ saved: true, savedId: saved._id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Post already saved', saved: true });
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unsave a post (user only)
// @route   DELETE /api/saved/:postId
const unsavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await SavedPost.findOneAndDelete({ user: req.user._id, post: postId });
    if (!result) return res.status(404).json({ message: 'Saved post not found', saved: false });
    res.json({ saved: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List the logged-in user's saved posts, newest first
// @route   GET /api/saved
const getSavedPosts = async (req, res) => {
  try {
    const saves = await SavedPost.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'post',
        populate: { path: 'business', select: 'businessName logoUrl industry' },
      });

    // A saved post can later be deleted by its business — drop those rows
    // instead of surfacing a null post to the frontend.
    const posts = saves.filter((save) => save.post && save.post.status === 'active').map((save) => save.post);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { savePost, unsavePost, getSavedPosts };
