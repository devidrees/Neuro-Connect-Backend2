import express from 'express';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Post from '../models/Post.js';
import { authenticate, authorize } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

// Get all pending doctors
router.get('/doctors/pending', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pendingDoctors = await User.find({
      role: 'doctor',
      verificationStatus: 'pending'
    }).select('-password');

    res.json(pendingDoctors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all doctors
router.get('/doctors', authenticate, authorize('admin'), async (req, res) => {
  try {
    const doctors = await User.find({
      role: 'doctor'
    }).select('-password');

    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get comprehensive platform statistics
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const activeDoctors = await User.countDocuments({ role: 'doctor', isActive: true });
    const pendingDoctors = await User.countDocuments({ role: 'doctor', verificationStatus: 'pending' });
    const verifiedDoctors = await User.countDocuments({ role: 'doctor', verificationStatus: 'approved' });

    // Session statistics
    const totalSessions = await Session.countDocuments();
    const pendingSessions = await Session.countDocuments({ status: 'pending' });
    const approvedSessions = await Session.countDocuments({ status: 'approved' });
    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const expiredSessions = await Session.countDocuments({ status: 'expired' });
    const rejectedSessions = await Session.countDocuments({ status: 'rejected' });

    // Post statistics
    const totalPosts = await Post.countDocuments();
    const publishedPosts = await Post.countDocuments({ isActive: true });
    const draftPosts = await Post.countDocuments({ isActive: false });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newSessionsThisWeek = await Session.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newPostsThisWeek = await Post.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      users: {
        total: totalUsers,
        students: totalStudents,
        doctors: totalDoctors,
        activeDoctors,
        pendingDoctors,
        verifiedDoctors
      },
      sessions: {
        total: totalSessions,
        pending: pendingSessions,
        approved: approvedSessions,
        completed: completedSessions,
        expired: expiredSessions,
        rejected: rejectedSessions
      },
      posts: {
        total: totalPosts,
        published: publishedPosts,
        draft: draftPosts
      },
      weeklyGrowth: {
        newUsers: newUsersThisWeek,
        newSessions: newSessionsThisWeek,
        newPosts: newPostsThisWeek
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get doctor performance analytics
router.get('/analytics/doctors', authenticate, authorize('admin'), async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('name email specialization isActive verificationStatus');
    
    const doctorStats = await Promise.all(doctors.map(async (doctor) => {
      const totalSessions = await Session.countDocuments({ doctor: doctor._id });
      const completedSessions = await Session.countDocuments({ 
        doctor: doctor._id, 
        status: 'completed' 
      });
      const pendingSessions = await Session.countDocuments({ 
        doctor: doctor._id, 
        status: 'pending' 
      });
      const approvedSessions = await Session.countDocuments({ 
        doctor: doctor._id, 
        status: 'approved' 
      });

      // Calculate average session duration
      const sessions = await Session.find({ 
        doctor: doctor._id, 
        duration: { $exists: true } 
      }).select('duration');
      
      const avgDuration = sessions.length > 0 
        ? sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / sessions.length 
        : 0;

      return {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        isActive: doctor.isActive,
        verificationStatus: doctor.verificationStatus,
        stats: {
          totalSessions,
          completedSessions,
          pendingSessions,
          approvedSessions,
          avgDuration: Math.round(avgDuration)
        }
      };
    }));

    res.json(doctorStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get session analytics over time
router.get('/analytics/sessions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let days;
    switch (period) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      default: days = 7;
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get sessions created in the period
    const sessions = await Session.find({
      createdAt: { $gte: startDate }
    }).select('createdAt status duration');

    // Group by date
    const dailyStats = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats[dateKey] = {
        total: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        expired: 0,
        rejected: 0,
        avgDuration: 0
      };
    }

    // Calculate daily statistics
    sessions.forEach(session => {
      const dateKey = session.createdAt.toISOString().split('T')[0];
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].total++;
        dailyStats[dateKey][session.status]++;
        if (session.duration) {
          dailyStats[dateKey].avgDuration += session.duration;
        }
      }
    });

    // Calculate average duration for each day
    Object.keys(dailyStats).forEach(date => {
      if (dailyStats[date].total > 0) {
        dailyStats[date].avgDuration = Math.round(dailyStats[date].avgDuration / dailyStats[date].total);
      }
    });

    res.json({
      period,
      days,
      dailyStats,
      totalSessions: sessions.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user growth analytics
router.get('/analytics/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let days;
    switch (period) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      default: days = 30;
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get users created in the period
    const users = await User.find({
      createdAt: { $gte: startDate }
    }).select('createdAt role');

    // Group by date and role
    const dailyStats = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats[dateKey] = {
        total: 0,
        students: 0,
        doctors: 0,
        admins: 0
      };
    }

    // Calculate daily statistics
    users.forEach(user => {
      const dateKey = user.createdAt.toISOString().split('T')[0];
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].total++;
        dailyStats[dateKey][user.role + 's']++;
      }
    });

    res.json({
      period,
      days,
      dailyStats,
      totalUsers: users.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify doctor
router.patch('/doctors/:doctorId/verify', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    
    const doctor = await User.findById(req.params.doctorId);
    
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.verificationStatus = status;
    doctor.verificationDate = new Date();
    doctor.verifiedBy = req.user._id;
    
    if (status === 'approved') {
      doctor.isActive = true;
    }

    await doctor.save();

    res.json({
      message: `Doctor ${status} successfully`,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        verificationStatus: doctor.verificationStatus,
        isActive: doctor.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all posts for admin management
router.get('/posts', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    // Search by title or content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by status (isActive)
    if (status && status !== 'all') {
      if (status === 'published') {
        query.isActive = true;
      } else if (status === 'draft') {
        query.isActive = false;
      }
    }
    
    const skip = (page - 1) * limit;
    
    const posts = await Post.find(query)
      .populate('author', 'name email specialization')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalPosts = await Post.countDocuments(query);
    
    res.json({
      posts,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
      hasNextPage: page * limit < totalPosts,
      hasPrevPage: page > 1
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user to get their role and related data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete related data based on user role
    if (user.role === 'doctor') {
      // Delete doctor's posts
      await Post.deleteMany({ author: userId });
      // Delete doctor's sessions
      await Session.deleteMany({ doctor: userId });
    } else if (user.role === 'student') {
      // Delete student's sessions
      await Session.deleteMany({ student: userId });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ 
      message: `${user.role} deleted successfully`,
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export doctor analytics as PDF
router.get('/analytics/doctors/pdf', authenticate, authorize('admin'), async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('name email specialization isActive verificationStatus');
    
    const doctorStats = await Promise.all(doctors.map(async (doctor) => {
      const totalSessions = await Session.countDocuments({ doctor: doctor._id });
      const completedSessions = await Session.countDocuments({ 
        doctor: doctor._id, 
        status: 'completed' 
      });
      const pendingSessions = await Session.countDocuments({ 
        doctor: doctor._id, 
        status: 'pending' 
      });
      const approvedSessions = await Session.countDocuments({ 
        doctor: doctor._id, 
        status: 'approved' 
      });

      // Calculate average session duration
      const sessions = await Session.find({ 
        doctor: doctor._id, 
        duration: { $exists: true } 
      }).select('duration');
      
      const avgDuration = sessions.length > 0 
        ? sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / sessions.length 
        : 0;

      return {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        isActive: doctor.isActive,
        verificationStatus: doctor.verificationStatus,
        stats: {
          totalSessions,
          completedSessions,
          pendingSessions,
          approvedSessions,
          avgDuration: Math.round(avgDuration)
        }
      };
    }));

    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="doctor-analytics-${new Date().toISOString().split('T')[0]}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Doctor Performance Analytics Report', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' })
       .moveDown(2);

    // Add summary statistics
    const totalDoctors = doctorStats.length;
    const totalSessions = doctorStats.reduce((sum, doctor) => sum + doctor.stats.totalSessions, 0);
    const totalCompleted = doctorStats.reduce((sum, doctor) => sum + doctor.stats.completedSessions, 0);
    const avgSessionsPerDoctor = totalDoctors > 0 ? Math.round(totalSessions / totalDoctors) : 0;

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Summary Statistics')
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Total Doctors: ${totalDoctors}`)
       .text(`Total Sessions: ${totalSessions}`)
       .text(`Completed Sessions: ${totalCompleted}`)
       .text(`Average Sessions per Doctor: ${avgSessionsPerDoctor}`)
       .moveDown(1);

    // Add individual doctor reports
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Individual Doctor Performance')
       .moveDown(1);

    doctorStats.forEach((doctor, index) => {
      // Doctor header
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text(`${index + 1}. ${doctor.name}`)
         .moveDown(0.3);

      // Doctor details
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Email: ${doctor.email}`)
         .text(`Specialization: ${doctor.specialization || 'Not specified'}`)
         .text(`Status: ${doctor.verificationStatus || 'pending'}`)
         .text(`Active: ${doctor.isActive ? 'Yes' : 'No'}`)
         .moveDown(0.3);

      // Performance stats
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Performance Statistics:')
         .moveDown(0.2);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`• Total Sessions: ${doctor.stats.totalSessions}`)
         .text(`• Completed Sessions: ${doctor.stats.completedSessions}`)
         .text(`• Pending Sessions: ${doctor.stats.pendingSessions}`)
         .text(`• Approved Sessions: ${doctor.stats.approvedSessions}`)
         .text(`• Average Session Duration: ${doctor.stats.avgDuration} minutes`)
         .moveDown(1);

      // Add page break if not the last doctor and page is getting full
      if (index < doctorStats.length - 1 && (index + 1) % 3 === 0) {
        doc.addPage();
      }
    });

    // Add footer
    doc.fontSize(8)
       .font('Helvetica')
       .text('Neuro Connect Mental Health Platform - Admin Report', { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;