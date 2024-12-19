const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotification } = require('./push');
const { sendEmail } = require('./email');

// Create and send a notification
const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();

    // Process each recipient
    for (const recipient of notification.recipients) {
      const user = await User.findById(recipient.user);
      if (!user) continue;

      // Send in-app notification via socket
      global.io.to(`user:${user._id}`).emit('notification:new', {
        notification: {
          ...notification.toObject(),
          sender: {
            _id: notification.sender._id,
            username: notification.sender.username,
            profilePicture: notification.sender.profilePicture
          }
        }
      });

      // Send push notification if user is subscribed
      if (user.pushSubscription && notification.delivery.channels.includes('push')) {
        await sendPushNotification(user.pushSubscription, {
          title: notification.title,
          body: notification.message,
          icon: notification.sender.profilePicture,
          data: {
            notificationId: notification._id,
            type: notification.type,
            url: notification.metadata?.url
          }
        });
      }

      // Send email notification if enabled
      if (notification.delivery.channels.includes('email')) {
        await sendEmail({
          to: user.email,
          subject: notification.title,
          template: getNotificationTemplate(notification),
          data: {
            username: user.username,
            notification
          }
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get notification template based on type
const getNotificationTemplate = (notification) => {
  switch (notification.type) {
    case 'message':
      return 'message-notification';
    case 'call':
      return 'call-notification';
    case 'group':
      return 'group-notification';
    case 'timetable':
      return 'timetable-notification';
    case 'lecture':
      return 'lecture-notification';
    case 'assignment':
      return 'assignment-notification';
    case 'announcement':
      return 'announcement-notification';
    default:
      return 'default-notification';
  }
};

// Create a system notification
const createSystemNotification = async (data) => {
  const systemUser = await User.findOne({ role: 'admin' });
  if (!systemUser) {
    throw new Error('System user not found');
  }

  return createNotification({
    ...data,
    sender: systemUser._id,
    type: 'system'
  });
};

// Create a group notification
const createGroupNotification = async (groupId, data) => {
  const group = await Group.findById(groupId)
    .populate('members.user', '_id pushSubscription email');

  if (!group) {
    throw new Error('Group not found');
  }

  const recipients = group.members.map(member => ({
    user: member.user._id
  }));

  return createNotification({
    ...data,
    recipients,
    scope: 'group',
    metadata: {
      ...data.metadata,
      group: groupId
    }
  });
};

// Create a faculty notification
const createFacultyNotification = async (faculty, data) => {
  const users = await User.find({
    faculty,
    role: { $in: ['dean', 'head_of_department', 'lecturer', 'student'] }
  });

  const recipients = users.map(user => ({
    user: user._id
  }));

  return createNotification({
    ...data,
    recipients,
    scope: 'faculty',
    metadata: {
      ...data.metadata,
      faculty
    }
  });
};

// Create a department notification
const createDepartmentNotification = async (department, data) => {
  const users = await User.find({
    department,
    role: { $in: ['head_of_department', 'lecturer', 'student'] }
  });

  const recipients = users.map(user => ({
    user: user._id
  }));

  return createNotification({
    ...data,
    recipients,
    scope: 'department',
    metadata: {
      ...data.metadata,
      department
    }
  });
};

// Create a timetable update notification
const createTimetableNotification = async (timetableId, data) => {
  const timetable = await Timetable.findById(timetableId);
  if (!timetable) {
    throw new Error('Timetable not found');
  }

  const users = await User.find({
    faculty: timetable.faculty,
    department: timetable.department,
    $or: [
      { role: 'lecturer' },
      {
        role: 'student',
        year: timetable.year,
        semester: timetable.semester
      }
    ]
  });

  const recipients = users.map(user => ({
    user: user._id
  }));

  return createNotification({
    ...data,
    type: 'timetable',
    recipients,
    scope: 'department',
    metadata: {
      ...data.metadata,
      faculty: timetable.faculty,
      department: timetable.department,
      year: timetable.year,
      semester: timetable.semester
    }
  });
};

// Delete expired notifications
const deleteExpiredNotifications = async () => {
  const expiredNotifications = await Notification.find({
    'delivery.expiresAt': { $lt: new Date() },
    status: 'active'
  });

  for (const notification of expiredNotifications) {
    notification.status = 'deleted';
    await notification.save();
  }
};

module.exports = {
  createNotification,
  createSystemNotification,
  createGroupNotification,
  createFacultyNotification,
  createDepartmentNotification,
  createTimetableNotification,
  deleteExpiredNotifications
};
