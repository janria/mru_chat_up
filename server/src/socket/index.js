const messageHandlers = require('./messageHandlers');
const webRTCHandlers = require('./webRTCHandlers');
const groupHandlers = require('./groupHandlers');
const notificationHandlers = require('./notificationHandlers');
const User = require('../models/User');

const setupSocketHandlers = (io) => {
  // Middleware for authentication and user tracking
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token and get user (implement your auth logic here)
      const user = await User.findById(socket.handshake.auth.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    try {
      // Update user's online status
      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: true,
        lastSeen: new Date()
      });

      // Join user's default rooms
      const defaultGroups = socket.user.defaultGroups;
      defaultGroups.forEach(groupId => {
        socket.join(`group:${groupId}`);
      });

      // Notify other users about online status
      socket.broadcast.emit('user:online', {
        userId: socket.user._id
      });

      // Set up handlers
      messageHandlers(io, socket);
      webRTCHandlers(io, socket);
      groupHandlers(io, socket);
      notificationHandlers(io, socket);

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.user._id}`);

        // Update user's online status and last seen
        await User.findByIdAndUpdate(socket.user._id, {
          isOnline: false,
          lastSeen: new Date()
        });

        // Notify other users about offline status
        socket.broadcast.emit('user:offline', {
          userId: socket.user._id,
          lastSeen: new Date()
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.user._id}:`, error);
      });

      // Handle custom events
      socket.on('ping', (callback) => {
        callback({
          status: 'success',
          timestamp: new Date()
        });
      });

      socket.on('typing', (data) => {
        socket.to(`group:${data.groupId}`).emit('user:typing', {
          userId: socket.user._id,
          groupId: data.groupId
        });
      });

      socket.on('stopTyping', (data) => {
        socket.to(`group:${data.groupId}`).emit('user:stopTyping', {
          userId: socket.user._id,
          groupId: data.groupId
        });
      });

    } catch (error) {
      console.error('Error in socket connection:', error);
      socket.emit('error', {
        message: 'Internal server error'
      });
    }
  });

  // Handle global errors
  io.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });

  return io;
};

module.exports = {
  setupSocketHandlers
};
