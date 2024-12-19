const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/push');
const { sendEmail } = require('../utils/email');

const notificationHandlers = (io, socket) => {
  // Subscribe to push notifications
  socket.on('notifications:subscribe', async (data, callback) => {
    try {
      const { subscription } = data;

      const user = await User.findById(socket.user._id);
      user.pushSubscription = subscription;
      await user.save();

      callback({
        status: 'success',
        message: 'Successfully subscribed to push notifications'
      });

    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      callback({
        status: 'error',
        message: 'Failed to subscribe to notifications'
      });
    }
  });

  // Unsubscribe from push notifications
  socket.on('notifications:unsubscribe', async (callback) => {
    try {
      const user = await User.findById(socket.user._id);
      user.pushSubscription = null;
      await user.save();

      callback({
        status: 'success',
        message: 'Successfully unsubscribed from push notifications'
      });

    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      callback({
        status: 'error',
        message: 'Failed to unsubscribe from notifications'
      });
    }
  });

  // Mark notifications as read
  socket.on('notifications:markRead', async (data, callback) => {
    try {
      const { notificationIds } = data;

      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          'recipients.user': socket.user._id,
          'recipients.readAt': { $exists: false }
        },
        {
          $set: {
            'recipients.$.readAt': new Date(),
            'recipients.$.status': 'read'
          }
        }
      );

      callback({
        status: 'success',
        message: 'Notifications marked as read'
      });

    } catch (error) {
      console.error('Error marking notifications as read:', error);
      callback({
        status: 'error',
        message: 'Failed to mark notifications as read'
      });
    }
  });

  // Mark notification as clicked
  socket.on('notifications:markClicked', async (data, callback) => {
    try {
      const { notificationId } = data;

      const notification = await Notification.findOne({
        _id: notificationId,
        'recipients.user': socket.user._id
      });

      if (notification) {
        notification.markAsClicked(socket.user._id);
        await notification.save();
      }

      callback({
        status: 'success',
        message: 'Notification marked as clicked'
      });

    } catch (error) {
      console.error('Error marking notification as clicked:', error);
      callback({
        status: 'error',
        message: 'Failed to mark notification as clicked'
      });
    }
  });

  // Dismiss notification
  socket.on('notifications:dismiss', async (data, callback) => {
    try {
      const { notificationId } = data;

      const notification = await Notification.findOne({
        _id: notificationId,
        'recipients.user': socket.user._id
      });

      if (notification) {
        notification.dismiss(socket.user._id);
        await notification.save();
      }

      callback({
        status: 'success',
        message: 'Notification dismissed'
      });

    } catch (error) {
      console.error('Error dismissing notification:', error);
      callback({
        status: 'error',
        message: 'Failed to dismiss notification'
      });
    }
  });

  // Update notification preferences
  socket.on('notifications:updatePreferences', async (data, callback) => {
    try {
      const { preferences } = data;

      const user = await User.findById(socket.user._id);
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...preferences
      };
      await user.save();

      callback({
        status: 'success',
        message: 'Notification preferences updated'
      });

    } catch (error) {
      console.error('Error updating notification preferences:', error);
      callback({
        status: 'error',
        message: 'Failed to update notification preferences'
      });
    }
  });

  // Handle notification delivery
  socket.on('notifications:delivered', async (data) => {
    try {
      const { notificationId } = data;

      await Notification.updateOne(
        {
          _id: notificationId,
          'recipients.user': socket.user._id
        },
        {
          $set: {
            'recipients.$.status': 'delivered'
          }
        }
      );

    } catch (error) {
      console.error('Error marking notification as delivered:', error);
    }
  });

  // Get user's active notifications
  socket.on('notifications:getActive', async (callback) => {
    try {
      const notifications = await Notification.getActiveForUser(socket.user._id)
        .populate('sender', 'username profilePicture')
        .populate('reference.id');

      callback({
        status: 'success',
        notifications
      });

    } catch (error) {
      console.error('Error getting active notifications:', error);
      callback({
        status: 'error',
        message: 'Failed to get notifications'
      });
    }
  });

  // Handle notification actions
  socket.on('notifications:action', async (data, callback) => {
    try {
      const { notificationId, action } = data;

      const notification = await Notification.findOne({
        _id: notificationId,
        'recipients.user': socket.user._id
      });

      if (!notification) {
        return callback({
          status: 'error',
          message: 'Notification not found'
        });
      }

      // Handle different action types
      switch (action.type) {
        case 'accept':
        case 'reject':
        case 'snooze':
        case 'custom':
          // Update notification status based on action
          notification.recipients.find(
            r => r.user.toString() === socket.user._id.toString()
          ).actionTaken = {
            type: action.type,
            timestamp: new Date(),
            data: action.data
          };
          
          await notification.save();

          // Emit action to relevant users/groups
          if (notification.reference && notification.reference.type) {
            io.to(`${notification.reference.type}:${notification.reference.id}`)
              .emit('notifications:actionTaken', {
                notificationId,
                userId: socket.user._id,
                action
              });
          }
          break;

        default:
          return callback({
            status: 'error',
            message: 'Invalid action type'
          });
      }

      callback({
        status: 'success',
        message: 'Action processed successfully'
      });

    } catch (error) {
      console.error('Error processing notification action:', error);
      callback({
        status: 'error',
        message: 'Failed to process action'
      });
    }
  });
};

module.exports = notificationHandlers;
