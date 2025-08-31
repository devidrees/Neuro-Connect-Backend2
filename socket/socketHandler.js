import Message from '../models/Message.js';
import Session from '../models/Session.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const socketHandler = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, 'secret');
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication error:', err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name}`);

    // Join session room
    socket.on('join-session', async (sessionId) => {
      try {
        const session = await Session.findById(sessionId);
        
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Check if user is part of this session
        if (session.student.toString() !== socket.userId && 
            session.doctor.toString() !== socket.userId) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(sessionId);
        socket.emit('joined-session', { sessionId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Handle new message
    socket.on('send-message', async (data) => {
      try {
        const { sessionId, content, type = 'text' } = data;
        
        if (!content || !content.trim()) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }
        
        const session = await Session.findById(sessionId);
        
        if (!session || session.status !== 'approved') {
          socket.emit('error', { message: 'Session not found or not approved' });
          return;
        }

        // Check if user is part of this session
        if (session.student.toString() !== socket.userId && 
            session.doctor.toString() !== socket.userId) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const message = new Message({
          sessionId,
          sender: socket.userId,
          content: content.trim(),
          type
        });

        await message.save();
        console.log('Message saved:', message._id);

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'name profileImage');

        console.log('Broadcasting message to session:', sessionId);
        // Send message to all users in the session room
        io.to(sessionId).emit('new-message', populatedMessage);
        
        // Confirm message sent to sender
        socket.emit('message-sent', populatedMessage);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message', error: error.message });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(data.sessionId).emit('user-typing', {
        userId: socket.userId,
        userName: socket.user.name
      });
    });

    socket.on('stop-typing', (data) => {
      socket.to(data.sessionId).emit('user-stop-typing', {
        userId: socket.userId
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });
};

export { socketHandler };
export default socketHandler;