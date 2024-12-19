const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  type: {
    type: String,
    enum: [
      'text',           // Regular text message
      'image',          // Image file
      'video',          // Video file
      'audio',          // Audio file
      'document',       // Document file
      'voice',          // Voice message
      'call_audio',     // Audio call
      'call_video',     // Video call
      'announcement',   // Group announcement
      'system',         // System message
      'lecture',        // Lecture-related message
      'assignment',     // Assignment-related message
      'timetable',      // Timetable update
      'notification'    // General notification
    ],
    required: true
  },
  content: {
    text: String,       // Text content
    fileUrl: String,    // URL for media files
    fileName: String,   // Original file name
    fileSize: Number,   // File size in bytes
    fileDuration: Number, // Duration for audio/video
    fileType: String,   // MIME type
    thumbnail: String,  // Thumbnail URL for images/videos
    metadata: {         // Additional metadata
      width: Number,    // For images/videos
      height: Number,   // For images/videos
      duration: Number, // For audio/video
      pages: Number,    // For documents
      encoding: String  // For audio/voice
    }
  },
  callData: {          // For call-related messages
    duration: Number,   // Call duration in seconds
    status: {
      type: String,
      enum: ['initiated', 'ongoing', 'completed', 'missed', 'rejected']
    },
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      joinedAt: Date,
      leftAt: Date,
      status: {
        type: String,
        enum: ['invited', 'joined', 'left', 'declined']
      }
    }]
  },
  lectureData: {       // For lecture-related messages
    title: String,
    description: String,
    startTime: Date,
    endTime: Date,
    courseUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseUnit'
    },
    materials: [{
      name: String,
      url: String,
      type: String
    }],
    recording: {
      url: String,
      duration: Number
    }
  },
  assignmentData: {    // For assignment-related messages
    title: String,
    description: String,
    dueDate: Date,
    attachments: [{
      name: String,
      url: String,
      type: String
    }]
  },
  replyTo: {           // For reply messages
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  forwardedFrom: {     // For forwarded messages
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  readBy: [{           // Track who has read the message
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{        // Message reactions
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: String,      // Emoji or reaction type
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {            // Message status
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed', 'deleted'],
    default: 'sent'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{      // Track message edits
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isAnnouncement: {
    type: Boolean,
    default: false
  },
  expiresAt: {         // For temporary messages
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ type: 1 });
messageSchema.index({ 'readBy.user': 1 });

// Method to mark message as read by a user
messageSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.some(read => read.user.toString() === userId.toString())) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
};

// Method to add a reaction
messageSchema.methods.addReaction = function(userId, reactionType) {
  const existingReaction = this.reactions.find(
    reaction => reaction.user.toString() === userId.toString()
  );

  if (existingReaction) {
    existingReaction.type = reactionType;
    existingReaction.createdAt = new Date();
  } else {
    this.reactions.push({
      user: userId,
      type: reactionType
    });
  }
};

// Method to remove a reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
