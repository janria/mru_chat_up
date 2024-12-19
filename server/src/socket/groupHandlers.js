const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const { createNotification } = require('../utils/notifications');

const groupHandlers = (io, socket) => {
  // Create a new group
  socket.on('group:create', async (data, callback) => {
    try {
      const {
        name,
        description,
        type,
        category,
        department,
        year,
        semester,
        members = []
      } = data;

      // Create new group
      const group = new Group({
        name,
        description,
        type,
        category,
        department,
        year,
        semester,
        creator: socket.user._id,
        admins: [socket.user._id],
        members: [{
          user: socket.user._id,
          role: 'admin'
        }]
      });

      // Add members
      if (members.length > 0) {
        const users = await User.find({ _id: { $in: members } });
        users.forEach(user => {
          group.addMember(user._id);
        });
      }

      await group.save();

      // Join group room
      socket.join(`group:${group._id}`);

      // Notify members
      members.forEach(async (userId) => {
        if (userId.toString() !== socket.user._id.toString()) {
          await createNotification({
            type: 'group',
            title: 'New Group',
            message: `${socket.user.username} added you to ${group.name}`,
            sender: socket.user._id,
            recipients: [{ user: userId }],
            priority: 'medium',
            category: 'social',
            scope: 'individual',
            reference: {
              type: 'group',
              id: group._id
            }
          });
        }
      });

      callback({
        status: 'success',
        group
      });

    } catch (error) {
      console.error('Error creating group:', error);
      callback({
        status: 'error',
        message: 'Failed to create group'
      });
    }
  });

  // Join a group
  socket.on('group:join', async (data, callback) => {
    try {
      const { groupId } = data;

      const group = await Group.findById(groupId);
      if (!group) {
        return callback({
          status: 'error',
          message: 'Group not found'
        });
      }

      if (group.isLocked && !group.isDefault) {
        return callback({
          status: 'error',
          message: 'This group is locked'
        });
      }

      // Add member
      group.addMember(socket.user._id);
      await group.save();

      // Join group room
      socket.join(`group:${groupId}`);

      // Notify group members
      io.to(`group:${groupId}`).emit('group:memberJoined', {
        groupId,
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          profilePicture: socket.user.profilePicture
        }
      });

      callback({
        status: 'success',
        group
      });

    } catch (error) {
      console.error('Error joining group:', error);
      callback({
        status: 'error',
        message: 'Failed to join group'
      });
    }
  });

  // Leave a group
  socket.on('group:leave', async (data, callback) => {
    try {
      const { groupId } = data;

      const group = await Group.findById(groupId);
      if (!group) {
        return callback({
          status: 'error',
          message: 'Group not found'
        });
      }

      if (group.isDefault) {
        return callback({
          status: 'error',
          message: 'Cannot leave default group'
        });
      }

      // Remove member
      group.removeMember(socket.user._id);
      await group.save();

      // Leave group room
      socket.leave(`group:${groupId}`);

      // Notify group members
      io.to(`group:${groupId}`).emit('group:memberLeft', {
        groupId,
        userId: socket.user._id
      });

      callback({
        status: 'success'
      });

    } catch (error) {
      console.error('Error leaving group:', error);
      callback({
        status: 'error',
        message: 'Failed to leave group'
      });
    }
  });

  // Update group settings
  socket.on('group:update', async (data, callback) => {
    try {
      const { groupId, updates } = data;

      const group = await Group.findById(groupId);
      if (!group) {
        return callback({
          status: 'error',
          message: 'Group not found'
        });
      }

      if (!group.isAdmin(socket.user._id)) {
        return callback({
          status: 'error',
          message: 'Not authorized to update group settings'
        });
      }

      // Update group
      Object.assign(group, updates);
      await group.save();

      // Notify group members
      io.to(`group:${groupId}`).emit('group:updated', {
        groupId,
        updates
      });

      callback({
        status: 'success',
        group
      });

    } catch (error) {
      console.error('Error updating group:', error);
      callback({
        status: 'error',
        message: 'Failed to update group'
      });
    }
  });

  // Add members to group
  socket.on('group:addMembers', async (data, callback) => {
    try {
      const { groupId, members } = data;

      const group = await Group.findById(groupId);
      if (!group) {
        return callback({
          status: 'error',
          message: 'Group not found'
        });
      }

      if (!group.isAdmin(socket.user._id)) {
        return callback({
          status: 'error',
          message: 'Not authorized to add members'
        });
      }

      // Add members
      const users = await User.find({ _id: { $in: members } });
      users.forEach(user => {
        group.addMember(user._id);
      });

      await group.save();

      // Notify new members
      members.forEach(async (userId) => {
        await createNotification({
          type: 'group',
          title: 'Added to Group',
          message: `${socket.user.username} added you to ${group.name}`,
          sender: socket.user._id,
          recipients: [{ user: userId }],
          priority: 'medium',
          category: 'social',
          scope: 'individual',
          reference: {
            type: 'group',
            id: group._id
          }
        });
      });

      // Notify group members
      io.to(`group:${groupId}`).emit('group:membersAdded', {
        groupId,
        members: users.map(user => ({
          _id: user._id,
          username: user.username,
          profilePicture: user.profilePicture
        }))
      });

      callback({
        status: 'success',
        group
      });

    } catch (error) {
      console.error('Error adding members:', error);
      callback({
        status: 'error',
        message: 'Failed to add members'
      });
    }
  });

  // Remove member from group
  socket.on('group:removeMember', async (data, callback) => {
    try {
      const { groupId, userId } = data;

      const group = await Group.findById(groupId);
      if (!group) {
        return callback({
          status: 'error',
          message: 'Group not found'
        });
      }

      if (!group.isAdmin(socket.user._id)) {
        return callback({
          status: 'error',
          message: 'Not authorized to remove members'
        });
      }

      // Remove member
      group.removeMember(userId);
      await group.save();

      // Notify removed user
      await createNotification({
        type: 'group',
        title: 'Removed from Group',
        message: `You were removed from ${group.name}`,
        sender: socket.user._id,
        recipients: [{ user: userId }],
        priority: 'medium',
        category: 'social',
        scope: 'individual',
        reference: {
          type: 'group',
          id: group._id
        }
      });

      // Notify group members
      io.to(`group:${groupId}`).emit('group:memberRemoved', {
        groupId,
        userId
      });

      callback({
        status: 'success'
      });

    } catch (error) {
      console.error('Error removing member:', error);
      callback({
        status: 'error',
        message: 'Failed to remove member'
      });
    }
  });
};

module.exports = groupHandlers;
