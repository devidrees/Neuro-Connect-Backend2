import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Post from '../models/Post.js';
import { authenticate, authorize, requireActiveDoctor } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Multer configuration for post images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../server/uploads/posts/'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpg|jpeg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create post (doctors only)
router.post('/', authenticate, authorize('doctor'), requireActiveDoctor, upload.single('image'), async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    const postData = {
      title,
      content,
      author: req.user._id,
      category: category || 'general'
    };

    if (req.file) {
      postData.image = `/uploads/posts/${req.file.filename}`;
    }

    const post = new Post(postData);
    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name specialization profileImage')
      .populate('comments.user', 'name profileImage');

    res.status(201).json({
      message: 'Post created successfully',
      post: populatedPost
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all posts
router.get('/', authenticate, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name specialization profileImage')
      .populate('comments.user', 'name profileImage')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get posts by a specific doctor
router.get('/doctor/:doctorId', authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.doctorId })
      .populate('author', 'name specialization profileImage')
      .populate('comments.user', 'name profileImage')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like/Unlike post
router.post('/:postId/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likeIndex = post.likes.findIndex(like => 
      like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push({ user: req.user._id });
    }

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name specialization profileImage')
      .populate('comments.user', 'name profileImage');

    res.json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add comment
router.post('/:postId/comment', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      user: req.user._id,
      content
    });

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name specialization profileImage')
      .populate('comments.user', 'name profileImage');

    res.json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;