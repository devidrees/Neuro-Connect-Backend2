import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Message from '../models/Message.js';
import Session from '../models/Session.js';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Multer configuration for chat files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../server/uploads/chat/'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('file');

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ message: 'File upload error', error: err.message });
  } else if (err) {
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  next();
};

// Get messages for a session
router.get('/:sessionId', authenticate, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is part of this session
    if (session.student.toString() !== req.user._id.toString() && 
        session.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ sessionId: req.params.sessionId })
      .populate('sender', 'name profileImage')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send message
router.post('/:sessionId/message', authenticate, (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    const { content, type } = req.body;
    
    const session = await Session.findById(req.params.sessionId);
    
    if (!session || session.status !== 'approved') {
      return res.status(404).json({ message: 'Session not found or not approved' });
    }

    // Check if user is part of this session
    if (session.student.toString() !== req.user._id.toString() && 
        session.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messageData = {
      sessionId: req.params.sessionId,
      sender: req.user._id,
      type: type || 'text'
    };

    if (type === 'text') {
      messageData.content = content;
    } else if (req.file) {
      messageData.fileName = req.file.originalname;
      messageData.filePath = `/uploads/chat/${req.file.filename}`;
      messageData.fileSize = req.file.size;
      console.log('File uploaded successfully:', req.file);
    } else {
      return res.status(400).json({ message: 'File is required for non-text messages' });
    }

    const message = new Message(messageData);
    await message.save();
    console.log('Message saved successfully:', message._id);

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name profileImage');

    // Broadcast file message to socket clients
    if (type !== 'text') {
      try {
        await req.app.locals.broadcastMessage(message._id);
      } catch (error) {
        console.error('Failed to broadcast file message:', error);
      }
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error in chat message route:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;