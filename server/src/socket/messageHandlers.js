const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createNotification } = require('../utils/notifications');

const messageHandlers = (io, socket) => {
  // Send a new message
  socket.on('message:send', async (data, callback) => {
    try {
      const { groupId, content, type = 'text', replyTo, metadata = {} } = data;

      // Verify group membership
      const group = await Group.findById(groupId);
      if (!group || !group.isMember(socket.user._id)) {
        return callback({
          status: 'error',
          message: 'Not authorized to send messages in this group'
        });
      }

      // Create new message
      const message = new Message({
        sender: socket.user._id,
        group: groupId,
        type,
        content: {
          text: content,
          ...metadata
        },
        replyTo
      });

      await message.save();

      // Populate sender details
      await message.populate('sender', 'username profilePicture');
      if (replyTo) {
        await message.populate('replyTo');
      }

      // Emit message to group members
      io.to(`group:${groupId}`).emit('message:new', {
        message,
        groupId
      });

      // Create notifications for mentioned users
      if (content.includes('@')) {
        const mentionedUsernames = content.match(/@(\w+)/g);
        if (mentionedUsernames) {
          const usernames = mentionedUsernames.map(u => u.substring(1));
          const mentionedUsers = await User.find({
            username: { $in: usernames }
          });

          mentionedUsers.forEach(async (user) => {
            if (user._id.toString() !== socket.user._id.toString()) {
              await createNotification({
                type: 'message',
                title: 'New mention',
                message: `${socket.user.username} mentioned you in a message`,
                sender: socket.user._id,
                recipients: [{ user: user._id }],
                priority: 'medium',
                category: 'social',
                scope: 'individual',
                reference: {
                  type: 'message',
                  id: message._id
                },
                metadata: {
                  group: groupId
                }
              });
            }
          });
        }
      }

      // Update group's last activity
      await Group.findByIdAndUpdate(groupId, {
        $set: { lastActivity: new Date() }
      });

      callback({
        status: 'success',
        message: message
      });

    } catch (error) {
      console.error('Error sending message:', error);
      callback({
        status: 'error',
        message: 'Failed to send message'
      });
    }
  });

  // Edit a message
  socket.on('message:edit', async (data, callback) => {
    try {
      const { messageId, content } = data;

      const message = await Message.findById(messageId);
      if (!message || message.sender.toString() !== socket.user._id.toString()) {
        return callback({
          status: 'error',
          message: 'Not authorized to edit this message'
        });
      }

      // Save edit history
      message.editHistory.push({
        content: message.content.text,
        editedAt: new Date(),
        editedBy: socket.user._id
      });

      // Update message content
      message.content.text = content;
      message.isEdited = true;
      await message.save();

      // Emit update to group members
      io.to(`group:${message.group}`).emit('message:update', {
        messageId,
        content,
        editedAt: new Date()
      });

      callback({
        status: 'success',
        message: 'Message updated successfully'
      });

    } catch (error) {
      console.error('Error editing message:', error);
      callback({
        status: 'error',
        message: 'Failed to edit message'
      });
    }
  });

  // Delete a message
  socket.on('message:delete', async (data, callback) => {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);
      if (!message || message.sender.toString() !== socket.user._id.toString()) {
        return callback({
          status: 'error',
          message: 'Not authorized to delete this message'
        });
      }

      message.status = 'deleted';
      await message.save();

      // Emit deletion to group members
      io.to(`group:${message.group}`).emit('message:delete', {
        messageId
      });

      callback({
        status: 'success',
        message: 'Message deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting message:', error);
      callback({
        status: 'error',
        message: 'Failed to delete message'
      });
    }
  });

  // React to a message
  socket.on('message:react', async (data, callback) => {
    try {
      const { messageId, reaction } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        return callback({
          status: 'error',
          message: 'Message not found'
        });
      }

      // Add or update reaction
      message.addReaction(socket.user._id, reaction);
      await message.save();

      // Emit reaction update to group members
      io.to(`group:${message.group}`).emit('message:reaction', {
        messageId,
        userId: socket.user._id,
        reaction
      });

      callback({
        status: 'success',
        message: 'Reaction added successfully'
      });

    } catch (error) {
      console.error('Error adding reaction:', error);
      callback({
        status: 'error',
        message: 'Failed to add reaction'
      });
    }
  });

  // Mark messages as read
  socket.on('message:read', async (data, callback) => {
    try {
      const { messageIds } = data;

      await Message.updateMany(
        {
          _id: { $in: messageIds },
          'readBy.user': { $ne: socket.user._id }
        },
        {
          $push: {
            readBy: {
              user: socket.user._id,
              readAt: new Date()
            }
          }
        }
      );

      callback({
        status: 'success',
        message: 'Messages marked as read'
      });

    } catch (error) {
      console.error('Error marking messages as read:', error);
      callback({
        status: 'error',
        message: 'Failed to mark messages as read'
      });
    }
  });
};

module.exports = messageHandlers;
