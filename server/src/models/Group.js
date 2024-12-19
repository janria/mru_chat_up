const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'university',      // Main university group
      'faculty',        // Faculty-specific groups
      'department',     // Department-specific groups
      'year',          // Year-specific groups
      'course',        // Course-specific groups
      'discussion',    // Discussion groups created by lecturers
      'custom'         // Custom groups created by users
    ],
    required: true
  },
  category: {
    type: String,
    enum: [
      'Business and Management',
      'Education',
      'Science and Technology',
      'Social, Cultural, and Development Studies',
      'General'
    ],
    required: function() {
      return ['faculty', 'department'].includes(this.type);
    }
  },
  department: {
    type: String,
    enum: [
      'Accounting and Finance',
      'Business Administration',
      'Procurement and Logistics Management',
      'Human Resource Management',
      'Commerce',
      'Arts and Education',
      'Science and Education',
      'Business Education',
      'Information Technology',
      'Computer Science',
      'Software Engineering',
      'Engineering',
      'Industrial Art & Design',
      'Development Studies',
      'Tourism and Hotel Management',
      'Social Work and Administration',
      'Mass Communication'
    ],
    required: function() {
      return this.type === 'department';
    }
  },
  year: {
    type: Number,
    min: 1,
    max: 4,
    required: function() {
      return this.type === 'year';
    }
  },
  semester: {
    type: Number,
    min: 1,
    max: 2,
    required: function() {
      return this.type === 'course';
    }
  },
  courseCode: {
    type: String,
    required: function() {
      return this.type === 'course';
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return ['discussion', 'custom'].includes(this.type);
    }
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  lastActivity: {
    type: Date,
    default: Date.now
  },
  settings: {
    allowMedia: {
      type: Boolean,
      default: true
    },
    allowLinks: {
      type: Boolean,
      default: true
    },
    allowReplies: {
      type: Boolean,
      default: true
    },
    allowForwarding: {
      type: Boolean,
      default: true
    },
    allowVoiceMessages: {
      type: Boolean,
      default: true
    },
    allowVideoMessages: {
      type: Boolean,
      default: true
    },
    allowFiles: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number,
      default: 10 * 1024 * 1024  // 10MB
    },
    allowedFileTypes: [{
      type: String
    }],
    moderationEnabled: {
      type: Boolean,
      default: false
    },
    autoDeleteMessages: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: {
        type: Number,
        default: 24 * 60 * 60  // 24 hours in seconds
      }
    }
  }
}, {
  timestamps: true
});

// Middleware to update lastActivity
groupSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// Method to check if a user is a member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// Method to check if a user is an admin
groupSchema.methods.isAdmin = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && 
    (member.role === 'admin' || member.role === 'moderator')
  );
};

// Method to add a member
groupSchema.methods.addMember = function(userId, role = 'member') {
  if (!this.isMember(userId)) {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
  }
};

// Method to remove a member
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
};

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
