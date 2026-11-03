const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const Business = require('../models/Business');
const Connection = require('../models/Connection');
const Activity = require('../models/Activity');
const cloudinary = require('../config/cloudinary');
const { visibleNowFilter } = require('../utils/postVisibility');

// @desc    Create a post (business only)
// @route   POST /api/posts
const createPost = async (req, res) => {
  try {
    const {
      postType,
      title,
      content,
      imageUrl,
      imagePublicId,
      tags,
      expiresAt,
      validFrom,
      collaborationRequirements,
      visibility,
    } = req.body;

    if (!['offer', 'promotion', 'collaboration'].includes(postType)) {
      return res.status(400).json({ message: 'postType must be offer, promotion, or collaboration' });
    }

    if (postType === 'collaboration' && visibility !== 'businesses_only') {
      return res.status(400).json({ message: 'Collaboration posts must be visible to businesses only' });
    }

    if (postType === 'offer' && (!validFrom || !expiresAt)) {
      return res.status(400).json({ message: 'Offers require a valid-from and valid-until date' });
    }

    const post = await Post.create({
      business: req.business._id,
      postType,
      title,
      content,
      imageUrl,
      imagePublicId: imagePublicId || '',
      tags,
      expiresAt: expiresAt || null,
      validFrom: validFrom || null,
      collaborationRequirements: collaborationRequirements || '',
      visibility: postType === 'collaboration' ? 'businesses_only' : 'consumers_and_businesses',
    });

    if (postType === 'offer') {
      const followers = await Follow.find({ business: req.business._id }).select('user');
      const message = `${req.business.businessName} published a new offer: ${title}`;
      await Notification.insertMany(followers.map((follow) => ({ user: follow.user, post: post._id, type: 'offer', message })));
    }

    res.status(201).json(await post.populate('business', 'businessName logoUrl industry'));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all posts by the logged-in business
// @route   GET /api/posts/mine
const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ business: req.business._id, status: 'active' })
      .populate('business', 'businessName logoUrl industry')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single post by id
// @route   GET /api/posts/:id
const getPostById = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, status: 'active' }).populate('business', 'businessName logoUrl');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a post (business only, must be owner)
// @route   PUT /api/posts/:id
const updatePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, status: 'active' });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.business.toString() !== req.business._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    const allowedFields = ['postType', 'title', 'content', 'imageUrl', 'imagePublicId', 'tags', 'expiresAt', 'validFrom', 'collaborationRequirements'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) post[field] = req.body[field];
    });
    const updated = await post.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a post (business only, must be owner) — soft-deletes the
//          record and destroys its Cloudinary image, if it has one.
// @route   DELETE /api/posts/:id
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.status === 'deleted') return res.status(404).json({ message: 'Post not found' });
    if (post.business.toString() !== req.business._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    post.status = 'deleted';
    post.deletedAt = new Date();
    await post.save();

    if (post.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(post.imagePublicId);
      } catch (cloudinaryError) {
        console.error('Failed to delete Cloudinary asset for post', post._id, cloudinaryError.message);
      }
    }

    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like / unlike a post (user only)
// @route   PUT /api/posts/:id/like
const toggleLikePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, status: 'active' });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const alreadyLiked = post.likes.includes(req.user._id);
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();
    await Activity.create({
      user: req.user._id,
      type: alreadyLiked ? 'unlike' : 'like',
      business: post.business,
      post: post._id,
    });
    res.json({ likes: post.likes.length, liked: !alreadyLiked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Feed for a business: posts from connections (regardless of city),
//          backfilled with same-industry, same-city posts when under-filled.
// @route   GET /api/posts/feed
const getConnectionsFeed = async (req, res) => {
  try {
    const myId = req.business._id;
    const limit = 20;
    const notExpired = { status: 'active', ...visibleNowFilter() };

    const connections = await Connection.find({
      status: 'accepted',
      $or: [{ requester: myId }, { recipient: myId }],
    }).select('requester recipient');

    const connectedIds = connections.map((connection) =>
      connection.requester.toString() === myId.toString() ? connection.recipient : connection.requester
    );

    let posts = [];
    if (connectedIds.length > 0) {
      posts = await Post.find({ business: { $in: connectedIds }, ...notExpired })
        .populate('business', 'businessName logoUrl industry')
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    if (posts.length < limit) {
      const industryBusinesses = await Business.find({
        industry: req.business.industry,
        city: req.business.city,
        _id: { $nin: [...connectedIds, myId] },
      }).select('_id');
      const industryBusinessIds = industryBusinesses.map((business) => business._id);

      const backfill = await Post.find({
        _id: { $nin: posts.map((post) => post._id) },
        business: { $in: industryBusinessIds },
        visibility: 'consumers_and_businesses',
        ...notExpired,
      })
        .populate('business', 'businessName logoUrl industry')
        .sort({ createdAt: -1 })
        .limit(limit - posts.length);

      posts = posts.concat(backfill);
    }

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createPost, getMyPosts, getPostById, updatePost, deletePost, toggleLikePost, getConnectionsFeed };
