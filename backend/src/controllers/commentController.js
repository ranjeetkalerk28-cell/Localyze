const Comment = require('../models/Comment');
const Post = require('../models/Post');

// @desc    List comments on a post, oldest first
// @route   GET /api/posts/:id/comments
const getComments = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, status: 'active' }).select('_id');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comments = await Comment.find({ post: req.params.id })
      .populate('user', 'name username')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a comment to a post (user only)
// @route   POST /api/posts/:id/comments
const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

    const post = await Post.findOne({ _id: req.params.id, status: 'active' }).select('_id');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({ post: req.params.id, user: req.user._id, content: content.trim() });
    res.status(201).json(await comment.populate('user', 'name username'));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getComments, addComment };
