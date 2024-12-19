const mongoose = require('mongoose');

const courseUnitSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
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
  creditUnits: {
    type: Number,
    required: true,
    min: 1
  },
  lecturers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  description: {
    type: String,
    trim: true
  },
  prerequisites: [{
    type: String,
    trim: true
  }],
  objectives: [{
    type: String,
    trim: true
  }],
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
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
    }
  }],
  materials: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    type: {
      type: String,
      enum: ['Document', 'Video', 'Audio', 'Link', 'Other']
    },
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignments: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    dueDate: Date,
    totalMarks: Number,
    weight: Number,
    attachments: [{
      name: String,
      url: String,
      type: String
    }]
  }],
  discussions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  notifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification'
  }],
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Archived'],
    default: 'Active'
  },
  settings: {
    allowDiscussions: {
      type: Boolean,
      default: true
    },
    allowMaterials: {
      type: Boolean,
      default: true
    },
    allowAssignments: {
      type: Boolean,
      default: true
    },
    autoCreateDiscussionGroup: {
      type: Boolean,
      default: true
    },
    notifyStudentsOnUpdate: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
courseUnitSchema.index({ code: 1 });
courseUnitSchema.index({ faculty: 1, department: 1 });
courseUnitSchema.index({ year: 1, semester: 1 });

// Method to get active lecturers
courseUnitSchema.methods.getActiveLecturers = function() {
  return this.lecturers.filter(lecturer => lecturer.status === 'Active');
};

// Method to check if a user is enrolled
courseUnitSchema.methods.isEnrolled = function(userId) {
  return this.students.some(student => student.toString() === userId.toString());
};

// Method to check if a user is a lecturer
courseUnitSchema.methods.isLecturer = function(userId) {
  return this.lecturers.some(lecturer => lecturer.toString() === userId.toString());
};

// Method to get upcoming schedule
courseUnitSchema.methods.getUpcomingSchedule = function() {
  const today = new Date();
  return this.schedule.filter(session => {
    const sessionDate = new Date(session.startTime);
    return sessionDate > today;
  });
};

// Method to get course materials
courseUnitSchema.methods.getMaterials = function(type = null) {
  if (type) {
    return this.materials.filter(material => material.type === type);
  }
  return this.materials;
};

const CourseUnit = mongoose.model('CourseUnit', courseUnitSchema);

module.exports = CourseUnit;
