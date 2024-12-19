const mongoose = require('mongoose');

const webRTCSessionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['invited', 'ringing', 'accepted', 'declined', 'busy', 'left', 'failed'],
      default: 'invited'
    },
    joinedAt: Date,
    leftAt: Date,
    deviceInfo: {
      browser: String,
      os: String,
      device: String
    },
    mediaState: {
      audio: {
        enabled: {
          type: Boolean,
          default: true
        },
        deviceId: String,
        quality: String
      },
      video: {
        enabled: {
          type: Boolean,
          default: true
        },
        deviceId: String,
        quality: String
      },
      screen: {
        sharing: {
          type: Boolean,
          default: false
        }
      }
    },
    connectionInfo: {
      ip: String,
      country: String,
      network: String,
      quality: String
    },
    peerConnection: {
      id: String,
      state: String,
      iceConnectionState: String,
      signalingState: String
    }
  }],
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  status: {
    type: String,
    enum: ['initiating', 'ongoing', 'ended', 'failed'],
    default: 'initiating'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  duration: Number,  // in seconds
  quality: {
    overall: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    audio: {
      bitrate: Number,
      packetLoss: Number,
      latency: Number
    },
    video: {
      bitrate: Number,
      packetLoss: Number,
      latency: Number,
      fps: Number,
      resolution: String
    }
  },
  recording: {
    enabled: {
      type: Boolean,
      default: false
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startTime: Date,
    endTime: Date,
    url: String,
    size: Number,
    format: String,
    duration: Number
  },
  chat: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['text', 'emoji', 'file'],
      default: 'text'
    }
  }],
  settings: {
    maxParticipants: {
      type: Number,
      default: 8
    },
    allowRecording: {
      type: Boolean,
      default: true
    },
    videoQuality: {
      type: String,
      enum: ['low', 'medium', 'high', 'hd'],
      default: 'medium'
    },
    audioQuality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    layout: {
      type: String,
      enum: ['grid', 'spotlight', 'sidebar'],
      default: 'grid'
    },
    features: {
      chat: {
        type: Boolean,
        default: true
      },
      screenSharing: {
        type: Boolean,
        default: true
      },
      handRaising: {
        type: Boolean,
        default: true
      },
      backgroundBlur: {
        type: Boolean,
        default: true
      }
    }
  },
  iceServers: [{
    urls: [String],
    username: String,
    credential: String
  }],
  metadata: {
    purpose: String,
    scheduled: Boolean,
    scheduledTime: Date,
    courseUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseUnit'
    },
    isLecture: {
      type: Boolean,
      default: false
    }
  },
  stats: {
    maxConcurrentParticipants: {
      type: Number,
      default: 0
    },
    totalParticipants: {
      type: Number,
      default: 0
    },
    technicalIssues: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      type: String,
      timestamp: Date,
      description: String
    }]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
webRTCSessionSchema.index({ initiator: 1, startTime: -1 });
webRTCSessionSchema.index({ group: 1 });
webRTCSessionSchema.index({ status: 1 });
webRTCSessionSchema.index({ 'participants.user': 1 });

// Method to add participant
webRTCSessionSchema.methods.addParticipant = function(userId, deviceInfo = {}) {
  if (!this.participants.some(p => p.user.toString() === userId.toString())) {
    this.participants.push({
      user: userId,
      deviceInfo,
      joinedAt: new Date()
    });
    this.stats.totalParticipants += 1;
    this.stats.maxConcurrentParticipants = Math.max(
      this.stats.maxConcurrentParticipants,
      this.getActiveParticipants().length
    );
  }
};

// Method to update participant status
webRTCSessionSchema.methods.updateParticipantStatus = function(userId, status) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  if (participant) {
    participant.status = status;
    if (status === 'left' || status === 'declined') {
      participant.leftAt = new Date();
    }
  }
};

// Method to get active participants
webRTCSessionSchema.methods.getActiveParticipants = function() {
  return this.participants.filter(
    p => ['accepted'].includes(p.status) && !p.leftAt
  );
};

// Method to end session
webRTCSessionSchema.methods.endSession = function() {
  this.status = 'ended';
  this.endTime = new Date();
  this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  this.participants.forEach(p => {
    if (!p.leftAt && p.status === 'accepted') {
      p.leftAt = this.endTime;
      p.status = 'left';
    }
  });
};

// Method to add chat message
webRTCSessionSchema.methods.addChatMessage = function(userId, message, type = 'text') {
  this.chat.push({
    sender: userId,
    message,
    type,
    timestamp: new Date()
  });
};

// Method to update connection quality
webRTCSessionSchema.methods.updateQuality = function(stats) {
  this.quality = {
    ...this.quality,
    ...stats
  };
};

const WebRTCSession = mongoose.model('WebRTCSession', webRTCSessionSchema);

module.exports = WebRTCSession;
