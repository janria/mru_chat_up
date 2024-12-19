const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  faculty: {
    type: String,
    enum: [
      'Business and Management',
      'Education',
      'Science and Technology',
      'Social, Cultural, and Development Studies'
    ],
    required: true
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
    required: true
  },
  program: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 2
  },
  academicYear: {
    type: String,
    required: true
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true
    },
    slots: [{
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      courseUnit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CourseUnit',
        required: true
      },
      lecturer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      room: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['Lecture', 'Tutorial', 'Practical', 'Workshop', 'Seminar'],
        default: 'Lecture'
      },
      recurring: {
        type: Boolean,
        default: true
      },
      color: {
        type: String,
        default: '#3498db'
      }
    }]
  }],
  specialSessions: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    courseUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseUnit'
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    room: String,
    type: {
      type: String,
      enum: ['Exam', 'Test', 'Make-up Class', 'Special Lecture', 'Other']
    },
    notifyStudents: {
      type: Boolean,
      default: true
    }
  }],
  holidays: [{
    name: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    description: String
  }],
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft'
  },
  version: {
    type: Number,
    default: 1
  },
  revisionHistory: [{
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],
    reason: String
  }],
  notifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification'
  }],
  settings: {
    allowConflicts: {
      type: Boolean,
      default: false
    },
    autoNotifyChanges: {
      type: Boolean,
      default: true
    },
    visibilityScope: {
      type: String,
      enum: ['Department', 'Faculty', 'University'],
      default: 'Department'
    },
    displayOptions: {
      showRoom: {
        type: Boolean,
        default: true
      },
      showLecturer: {
        type: Boolean,
        default: true
      },
      showType: {
        type: Boolean,
        default: true
      },
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '24h'
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
timetableSchema.index({ faculty: 1, department: 1 });
timetableSchema.index({ year: 1, semester: 1 });
timetableSchema.index({ status: 1 });

// Method to check for schedule conflicts
timetableSchema.methods.checkConflicts = function() {
  const conflicts = [];
  this.schedule.forEach(day => {
    const slots = day.slots;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slot1 = slots[i];
        const slot2 = slots[j];
        if (this.isTimeOverlap(slot1, slot2)) {
          conflicts.push({
            day: day.day,
            slot1,
            slot2
          });
        }
      }
    }
  });
  return conflicts;
};

// Helper method to check time overlap
timetableSchema.methods.isTimeOverlap = function(slot1, slot2) {
  const start1 = this.timeToMinutes(slot1.startTime);
  const end1 = this.timeToMinutes(slot1.endTime);
  const start2 = this.timeToMinutes(slot2.startTime);
  const end2 = this.timeToMinutes(slot2.endTime);
  
  return (start1 < end2 && start2 < end1);
};

// Helper method to convert time to minutes
timetableSchema.methods.timeToMinutes = function(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Method to get schedule for a specific day
timetableSchema.methods.getDaySchedule = function(day) {
  const daySchedule = this.schedule.find(s => s.day === day);
  return daySchedule ? daySchedule.slots : [];
};

// Method to get upcoming sessions
timetableSchema.methods.getUpcomingSessions = function() {
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const daySchedule = this.getDaySchedule(today);
  return daySchedule.filter(slot => {
    const slotTime = this.timeToMinutes(slot.startTime);
    return slotTime > currentTime;
  });
};

// Method to add special session
timetableSchema.methods.addSpecialSession = function(sessionData) {
  this.specialSessions.push(sessionData);
};

// Method to get active notifications
timetableSchema.methods.getActiveNotifications = function() {
  return this.notifications.filter(notification => 
    notification.status === 'Active' || notification.status === 'Pending'
  );
};

const Timetable = mongoose.model('Timetable', timetableSchema);

module.exports = Timetable;
