import express from 'express';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Create session request (students only)
router.post('/', authenticate, authorize('student'), async (req, res) => {
  try {
    const { doctorId, title, description, isAnonymous, anonymousName, preferredDateTime, duration } = req.body;

    // Check if doctor exists and is active
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor' || !doctor.isActive) {
      return res.status(404).json({ message: 'Doctor not found or not available' });
    }

    const sessionData = {
      student: req.user._id,
      doctor: doctorId,
      title,
      description,
      isAnonymous: isAnonymous || false,
      preferredDateTime: new Date(preferredDateTime),
      duration: duration || 1 // Changed from 60 to 1 minute for testing
    };

    // Always set anonymousName when isAnonymous is true
    if (isAnonymous) {
      sessionData.anonymousName = anonymousName || 'Anonymous Student';
    }

    console.log('Creating session with data:', sessionData);

    const session = new Session(sessionData);
    
    // Validate and ensure all required fields are set
    session.validateSessionData();
    
    await session.save();

    const populatedSession = await Session.findById(session._id)
      .populate('student', 'name email')
      .populate('doctor', 'name specialization');

    res.status(201).json({
      message: 'Session request created successfully',
      session: populatedSession
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's sessions
router.get('/my-sessions', authenticate, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'student') {
      query.student = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctor = req.user._id;
    }

    const sessions = await Session.find(query)
      .populate('student', 'name email')
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get expired sessions (for background job)
router.get('/expired', async (req, res) => {
  try {
    const expiredSessions = await Session.find({
      status: 'approved',
      endTime: { $lt: new Date() }
    });

    res.json(expiredSessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update session status (doctors only)
router.patch('/:sessionId/status', authenticate, authorize('doctor'), async (req, res) => {
  try {
    const { status, doctorResponse } = req.body;
    
    const session = await Session.findOne({
      _id: req.params.sessionId,
      doctor: req.user._id
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = status;
    session.responseDate = new Date();
    
    if (doctorResponse) {
      session.doctorResponse = doctorResponse;
    }

    await session.save();

    const populatedSession = await Session.findById(session._id)
      .populate('student', 'name email')
      .populate('doctor', 'name specialization');

    res.json({
      message: 'Session status updated successfully',
      session: populatedSession
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// End session with feedback (doctors only)
router.post('/:sessionId/end', authenticate, authorize('doctor'), async (req, res) => {
  try {
    const { feedback, rating, notes } = req.body;
    
    const session = await Session.findOne({
      _id: req.params.sessionId,
      doctor: req.user._id,
      status: 'approved'
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found or not approved' });
    }

    // Check if session has already ended
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Session has already ended' });
    }

    // Ensure endTime is set
    session.ensureEndTime();

    await session.endSession(feedback, rating, notes);

    const populatedSession = await Session.findById(session._id)
      .populate('student', 'name email')
      .populate('doctor', 'name specialization');

    res.json({
      message: 'Session ended successfully',
      session: populatedSession
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Auto-expire sessions (for background job)
router.post('/auto-expire', async (req, res) => {
  try {
    const expiredSessions = await Session.find({
      status: 'approved',
      endTime: { $lt: new Date() }
    });

    let expiredCount = 0;
    for (const session of expiredSessions) {
      session.status = 'expired';
      session.sessionEndedAt = new Date();
      await session.save();
      expiredCount++;
    }

    res.json({
      message: `Auto-expired ${expiredCount} sessions`,
      expiredCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;