const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('Authentication token required');
    }

    const decoded = await verifyToken(token);
    const user = await User.findOne({ 
      _id: decoded.userId,
      'tokens.token': token 
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Add user and token to request
    req.user = user;
    req.token = token;
    next();

  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Please authenticate',
      error: error.message
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this resource'
      });
    }
    next();
  };
};

// Faculty-based authorization middleware
const authorizeFaculty = (req, res, next) => {
  const userFaculty = req.user.faculty;
  const targetFaculty = req.params.faculty || req.body.faculty;

  if (!userFaculty || userFaculty !== targetFaculty) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access this faculty\'s resources'
    });
  }
  next();
};

// Department-based authorization middleware
const authorizeDepartment = (req, res, next) => {
  const userDepartment = req.user.department;
  const targetDepartment = req.params.department || req.body.department;

  if (!userDepartment || userDepartment !== targetDepartment) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access this department\'s resources'
    });
  }
  next();
};

// Group-based authorization middleware
const authorizeGroup = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.body.groupId;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found'
      });
    }

    if (!group.isMember(req.user._id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this group'
      });
    }

    req.group = group;
    next();

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error checking group authorization',
      error: error.message
    });
  }
};

// Admin authorization middleware
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required'
    });
  }
  next();
};

// Lecturer authorization middleware
const authorizeLecturer = (req, res, next) => {
  if (!['admin', 'lecturer'].includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Lecturer access required'
    });
  }
  next();
};

// Course unit authorization middleware
const authorizeCourseUnit = async (req, res, next) => {
  try {
    const courseUnitId = req.params.courseUnitId || req.body.courseUnitId;
    const courseUnit = await CourseUnit.findById(courseUnitId);

    if (!courseUnit) {
      return res.status(404).json({
        status: 'error',
        message: 'Course unit not found'
      });
    }

    // Check if user is a lecturer for this course
    if (req.user.role === 'lecturer') {
      if (!courseUnit.lecturers.includes(req.user._id)) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to access this course unit'
        });
      }
    }
    // Check if student is enrolled in this course
    else if (req.user.role === 'student') {
      if (courseUnit.faculty !== req.user.faculty ||
          courseUnit.department !== req.user.department ||
          courseUnit.year !== req.user.yearOfStudy ||
          courseUnit.semester !== req.user.semester) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to access this course unit'
        });
      }
    }

    req.courseUnit = courseUnit;
    next();

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error checking course unit authorization',
      error: error.message
    });
  }
};

// Generate auth token
const generateAuthToken = async (user) => {
  const token = jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  user.tokens = user.tokens || [];
  user.tokens.push({ token });
  await user.save();

  return token;
};

// Revoke auth token
const revokeAuthToken = async (user, token) => {
  user.tokens = user.tokens.filter(t => t.token !== token);
  await user.save();
};

module.exports = {
  auth,
  authorize,
  authorizeFaculty,
  authorizeDepartment,
  authorizeGroup,
  authorizeAdmin,
  authorizeLecturer,
  authorizeCourseUnit,
  generateAuthToken,
  revokeAuthToken
};
