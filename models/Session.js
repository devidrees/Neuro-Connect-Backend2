import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  anonymousName: {
    type: String,
    default: 'Anonymous Student'
  },
  preferredDateTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // Duration in minutes
    default: 60,
    min: 1,
    max: 180
  },
  endTime: {
    type: Date, // Calculated end time (preferredDateTime + duration)
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  chatRoom: {
    type: String,
    unique: true
  },
  notes: {
    type: String,
    default: ''
  },
  doctorResponse: {
    type: String,
    default: ''
  },
  responseDate: {
    type: Date
  },
  sessionEndedAt: {
    type: Date
  },
  finalFeedback: {
    type: String,
    default: ''
  },
  sessionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  sessionNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Generate unique chat room ID when session is approved
sessionSchema.pre('save', function(next) {
  if (this.status === 'approved' && !this.chatRoom) {
    this.chatRoom = `chat_${this._id}_${Date.now()}`;
  }
  
  // Calculate end time when session is created or updated
  if (this.preferredDateTime) {
    const durationInMinutes = this.duration || 60; // Default to 60 minutes if not set
    this.endTime = new Date(this.preferredDateTime.getTime() + (durationInMinutes * 60 * 1000));
  }
  
  next();
});

// Method to check if session has expired
sessionSchema.methods.isExpired = function() {
  if (!this.endTime) {
    // If endTime is not set, calculate it
    const durationInMinutes = this.duration || 60;
    this.endTime = new Date(this.preferredDateTime.getTime() + (durationInMinutes * 60 * 1000));
  }
  return new Date() > this.endTime;
};

// Method to ensure endTime is set
sessionSchema.methods.ensureEndTime = function() {
  if (!this.endTime && this.preferredDateTime) {
    const durationInMinutes = this.duration || 1; // Updated to use 1 minute default
    this.endTime = new Date(this.preferredDateTime.getTime() + (durationInMinutes * 60 * 1000));
  }
  return this;
};

// Method to validate session data before saving
sessionSchema.methods.validateSessionData = function() {
  if (this.isAnonymous && !this.anonymousName) {
    this.anonymousName = 'Anonymous Student';
  }
  
  if (this.preferredDateTime && !this.endTime) {
    const durationInMinutes = this.duration || 1; // Updated to use 1 minute default
    this.endTime = new Date(this.preferredDateTime.getTime() + (durationInMinutes * 60 * 1000));
  }
  
  return this;
};

// Method to end session with feedback
sessionSchema.methods.endSession = function(feedback, rating, notes) {
  this.status = 'completed';
  this.sessionEndedAt = new Date();
  this.finalFeedback = feedback || '';
  this.sessionRating = rating || null;
  this.sessionNotes = notes || '';
  return this.save();
};

export default mongoose.model('Session', sessionSchema);