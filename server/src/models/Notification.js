const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'message',           // New message notification
      'call',             // Call notification
      'group',            // Group-related notification
      'timetable',        // Timetable update notification
      'lecture',          // Lecture-related notification
      'assignment',       // Assignment notification
      'announcement',     // General announcement
      'reminder',         // Reminder notification
      'system'           // System notification
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipients: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: Date,
    status: {
      type: String,
      enum: ['delivered', 'read', 'clicked', 'dismissed'],
      default: 'delivered'
    }
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: [
      'academic',        // Academic-related notifications
      'administrative',  // Administrative notifications
      'social',         // Social notifications
      'technical'       // Technical notifications
    ],
    required: true
  },
  scope: {
    type: String,
    enum: [
      'individual',     // Single user
      'group',         // Specific group
      'department',    // Department-wide
      'faculty',       // Faculty-wide
      'university'     // University-wide
    ],
    required: true
  },
  reference: {
    type: {
      type: String,
      enum: [
        'message',
        'group',
        'timetable',
        'courseUnit',
        'webrtcSession',
        'user'
      ]
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'reference.type'
    }
  },
  metadata: {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    courseUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseUnit'
    },
    faculty: String,
    department: String,
    year: Number,
    semester: Number,
    url: String,
    actionType: String,
    actionData: mongoose.Schema.Types.Mixed
  },
  delivery: {
    channels: [{
      type: String,
      enum: ['in-app', 'email', 'push', 'sms'],
      default: ['in-app']
    }],
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    attempts: [{
      channel: String,
      timestamp: Date,
      status: String,
      error: String
    }],
    scheduledFor: Date,
    expiresAt: Date
  },
  actions: [{
    label: String,
    type: String,
    url: String,
    data: mongoose.Schema.Types.Mixed
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  settings: {
    dismissible: {
      type: Boolean,
      default: true
    },
    persistent: {
      type: Boolean,
      default: false
    },
    autoDelete: {
      enabled: {
        type: Boolean,
        default: false
      },
      after: {
        type: Number,
        default: 30  // days
      }
    },
    requireConfirmation: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ 'recipients.user': 1, 'recipients.status': 1 });
notificationSchema.index({ 'delivery.scheduledFor': 1 });

// Method to mark as read for a user
notificationSchema.methods.markAsRead = function(userId) {
  const recipient = this.recipients.find(
    r => r.user.toString() === userId.toString()
  );
  if (recipient && !recipient.readAt) {
    recipient.readAt = new Date();
    recipient.status = 'read';
  }
};

// Method to mark as clicked for a user
notificationSchema.methods.markAsClicked = function(userId) {
  const recipient = this.recipients.find(
    r => r.user.toString() === userId.toString()
  );
  if (recipient) {
    recipient.status = 'clicked';
  }
};

// Method to dismiss notification for a user
notificationSchema.methods.dismiss = function(userId) {
  const recipient = this.recipients.find(
    r => r.user.toString() === userId.toString()
  );
  if (recipient && this.settings.dismissible) {
    recipient.status = 'dismissed';
  }
};

// Method to add delivery attempt
notificationSchema.methods.addDeliveryAttempt = function(channel, status, error = null) {
  this.delivery.attempts.push({
    channel,
    timestamp: new Date(),
    status,
    error
  });
  
  // Update overall delivery status
  const allAttemptsFailed = this.delivery.attempts.every(
    attempt => attempt.status === 'failed'
  );
  this.delivery.status = allAttemptsFailed ? 'failed' : 'sent';
};

// Method to check if notification is expired
notificationSchema.methods.isExpired = function() {
  if (!this.delivery.expiresAt) return false;
  return new Date() > this.delivery.expiresAt;
};

// Method to get unread recipients
notificationSchema.methods.getUnreadRecipients = function() {
  return this.recipients.filter(r => !r.readAt);
};

// Method to add recipient
notificationSchema.methods.addRecipient = function(userId) {
  if (!this.recipients.some(r => r.user.toString() === userId.toString())) {
    this.recipients.push({
      user: userId
    });
  }
};

// Static method to get active notifications for user
notificationSchema.statics.getActiveForUser = function(userId) {
  return this.find({
    'recipients.user': userId,
    'recipients.status': { $ne: 'dismissed' },
    status: 'active',
    $or: [
      { 'delivery.expiresAt': { $exists: false } },
      { 'delivery.expiresAt': { $gt: new Date() } }
    ]
  }).sort('-createdAt');
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
