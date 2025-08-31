import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import sessionRoutes from './routes/sessions.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';

// Import socket handlers
import socketHandler from './socket/socketHandler.js';

dotenv.config();

const app = express();
const server = createServer(app);
// CORS configuration for development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://localhost:5180'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(limiter);
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'server/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Neuro Connect API is running!' });
});

// Socket.io
socketHandler(io);

// Function to broadcast messages to socket clients (for use in routes)
export const broadcastMessage = async (messageId) => {
  try {
    const Message = (await import('./models/Message.js')).default;
    const populatedMessage = await Message.findById(messageId)
      .populate('sender', 'name profileImage');
    
    if (populatedMessage) {
      console.log('Broadcasting message to session:', populatedMessage.sessionId);
      io.to(populatedMessage.sessionId.toString()).emit('new-message', populatedMessage);
    }
  } catch (error) {
    console.error('Error broadcasting message:', error);
  }
};

// Make broadcastMessage available to routes
app.locals.broadcastMessage = broadcastMessage;

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/neuroo");
    console.log('MongoDB connected successfully');
    
    // Start background job for session expiration
    startSessionExpirationJob();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Background job to automatically expire sessions
const startSessionExpirationJob = () => {
  // Run every 5 minutes
  setInterval(async () => {
    try {
      const Session = (await import('./models/Session.js')).default;
      
      const expiredSessions = await Session.find({
        status: 'approved',
        endTime: { $lt: new Date() }
      });

      if (expiredSessions.length > 0) {
        console.log(`Auto-expiring ${expiredSessions.length} sessions`);
        
        for (const session of expiredSessions) {
          session.status = 'expired';
          session.sessionEndedAt = new Date();
          await session.save();
        }
        
        // Notify connected clients about expired sessions
        expiredSessions.forEach(session => {
          io.to(session.chatRoom).emit('session-expired', {
            sessionId: session._id,
            message: 'Session has expired automatically'
          });
        });
      }
    } catch (error) {
      console.error('Error in session expiration job:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  console.log('Session expiration job started');
};

const PORT = 8000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Neuro Connect server running on http://localhost:${PORT}`);
  });
});

export { io };