const WebRTCSession = require('../models/WebRTCSession');
const User = require('../models/User');
const { createNotification } = require('../utils/notifications');
const { getIceServers } = require('../utils/webrtc');

const webRTCHandlers = (io, socket) => {
  // Initiate a call
  socket.on('call:initiate', async (data, callback) => {
    try {
      const { type, participants, groupId = null, metadata = {} } = data;

      // Create new WebRTC session
      const session = new WebRTCSession({
        type,
        initiator: socket.user._id,
        group: groupId,
        metadata,
        iceServers: await getIceServers()
      });

      // Add participants
      const users = await User.find({ _id: { $in: participants } });
      users.forEach(user => {
        session.addParticipant(user._id, {
          browser: socket.handshake.headers['user-agent']
        });
      });

      await session.save();

      // Join session room
      socket.join(`session:${session._id}`);

      // Notify participants
      participants.forEach(async (userId) => {
        if (userId.toString() !== socket.user._id.toString()) {
          io.to(`user:${userId}`).emit('call:incoming', {
            sessionId: session._id,
            type,
            initiator: {
              _id: socket.user._id,
              username: socket.user.username,
              profilePicture: socket.user.profilePicture
            },
            groupId,
            metadata
          });

          // Create notification
          await createNotification({
            type: 'call',
            title: `Incoming ${type} call`,
            message: `${socket.user.username} is calling you`,
            sender: socket.user._id,
            recipients: [{ user: userId }],
            priority: 'high',
            category: 'social',
            scope: 'individual',
            reference: {
              type: 'webrtcSession',
              id: session._id
            }
          });
        }
      });

      callback({
        status: 'success',
        sessionId: session._id
      });

    } catch (error) {
      console.error('Error initiating call:', error);
      callback({
        status: 'error',
        message: 'Failed to initiate call'
      });
    }
  });

  // Handle call response
  socket.on('call:response', async (data, callback) => {
    try {
      const { sessionId, response, deviceInfo = {} } = data;

      const session = await WebRTCSession.findById(sessionId);
      if (!session) {
        return callback({
          status: 'error',
          message: 'Call session not found'
        });
      }

      session.updateParticipantStatus(socket.user._id, response);
      
      if (response === 'accepted') {
        socket.join(`session:${sessionId}`);
        session.addParticipant(socket.user._id, deviceInfo);
      }

      await session.save();

      // Notify other participants
      io.to(`session:${sessionId}`).emit('call:participantResponse', {
        sessionId,
        participant: socket.user._id,
        response
      });

      callback({
        status: 'success',
        session
      });

    } catch (error) {
      console.error('Error handling call response:', error);
      callback({
        status: 'error',
        message: 'Failed to process call response'
      });
    }
  });

  // Handle WebRTC signaling
  socket.on('webrtc:signal', async (data) => {
    const { sessionId, signal, targetUserId } = data;

    io.to(`user:${targetUserId}`).emit('webrtc:signal', {
      sessionId,
      signal,
      userId: socket.user._id
    });
  });

  // Handle ICE candidate exchange
  socket.on('webrtc:ice-candidate', async (data) => {
    const { sessionId, candidate, targetUserId } = data;

    io.to(`user:${targetUserId}`).emit('webrtc:ice-candidate', {
      sessionId,
      candidate,
      userId: socket.user._id
    });
  });

  // Update media state
  socket.on('call:mediaUpdate', async (data, callback) => {
    try {
      const { sessionId, mediaState } = data;

      const session = await WebRTCSession.findById(sessionId);
      if (!session) {
        return callback({
          status: 'error',
          message: 'Call session not found'
        });
      }

      const participant = session.participants.find(
        p => p.user.toString() === socket.user._id.toString()
      );

      if (participant) {
        participant.mediaState = {
          ...participant.mediaState,
          ...mediaState
        };
        await session.save();

        // Notify other participants
        io.to(`session:${sessionId}`).emit('call:participantMediaUpdate', {
          sessionId,
          userId: socket.user._id,
          mediaState
        });
      }

      callback({
        status: 'success'
      });

    } catch (error) {
      console.error('Error updating media state:', error);
      callback({
        status: 'error',
        message: 'Failed to update media state'
      });
    }
  });

  // End call
  socket.on('call:end', async (data, callback) => {
    try {
      const { sessionId } = data;

      const session = await WebRTCSession.findById(sessionId);
      if (!session) {
        return callback({
          status: 'error',
          message: 'Call session not found'
        });
      }

      session.endSession();
      await session.save();

      // Notify all participants
      io.to(`session:${sessionId}`).emit('call:ended', {
        sessionId,
        endedBy: socket.user._id
      });

      // Clear session room
      const sockets = await io.in(`session:${sessionId}`).fetchSockets();
      sockets.forEach(s => s.leave(`session:${sessionId}`));

      callback({
        status: 'success'
      });

    } catch (error) {
      console.error('Error ending call:', error);
      callback({
        status: 'error',
        message: 'Failed to end call'
      });
    }
  });

  // Handle connection quality updates
  socket.on('call:qualityUpdate', async (data) => {
    const { sessionId, stats } = data;

    try {
      const session = await WebRTCSession.findById(sessionId);
      if (session) {
        session.updateQuality(stats);
        await session.save();

        io.to(`session:${sessionId}`).emit('call:qualityStats', {
          sessionId,
          stats
        });
      }
    } catch (error) {
      console.error('Error updating call quality:', error);
    }
  });

  // Handle recording controls
  socket.on('call:recording', async (data, callback) => {
    try {
      const { sessionId, action, recordingData = {} } = data;

      const session = await WebRTCSession.findById(sessionId);
      if (!session) {
        return callback({
          status: 'error',
          message: 'Call session not found'
        });
      }

      if (action === 'start') {
        session.recording = {
          enabled: true,
          startedBy: socket.user._id,
          startTime: new Date(),
          ...recordingData
        };
      } else if (action === 'stop') {
        session.recording = {
          ...session.recording,
          ...recordingData,
          endTime: new Date()
        };
      }

      await session.save();

      io.to(`session:${sessionId}`).emit('call:recordingUpdate', {
        sessionId,
        action,
        recording: session.recording
      });

      callback({
        status: 'success',
        recording: session.recording
      });

    } catch (error) {
      console.error('Error handling recording:', error);
      callback({
        status: 'error',
        message: 'Failed to handle recording'
      });
    }
  });
};

module.exports = webRTCHandlers;
