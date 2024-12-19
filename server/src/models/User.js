const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: [
      'admin',
      'chancellor',
      'vice_chancellor',
      'dean',
      'head_of_department',
      'lecturer',
      'student',
      'bursar',
      'academic_registrar',
      'dean_of_students',
      'quality_assurance'
    ],
    required: true
  },
  faculty: {
    type: String,
    enum: [
      'Business and Management',
      'Education',
      'Science and Technology',
      'Social, Cultural, and Development Studies'
    ],
    required: function() {
      return ['dean', 'head_of_department', 'lecturer', 'student'].includes(this.role);
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
      return ['head_of_department', 'lecturer', 'student'].includes(this.role);
    }
  },
  program: {
    type: String,
    required: function() {
      return this.role === 'student';
    }
  },
  yearOfStudy: {
    type: Number,
    required: function() {
      return this.role === 'student';
    },
    min: 1,
    max: 4
  },
  semester: {
    type: Number,
    required: function() {
      return this.role === 'student';
    },
    min: 1,
    max: 2
  },
  profilePicture: {
    type: String,
    default: 'default-profile.png'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date
  },
  defaultGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  otherGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  notifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification'
  }],
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to get user's default groups based on role and details
userSchema.methods.getDefaultGroups = function() {
  const groups = ['university'];
  
  if (this.faculty) {
    groups.push(`faculty_${this.faculty}`);
  }
  
  if (this.department) {
    groups.push(`department_${this.department}`);
  }
  
  if (this.role === 'student' && this.yearOfStudy) {
    groups.push(`year_${this.yearOfStudy}`);
  }
  
  return groups;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
