const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      default: 'Donor',
      immutable: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Prevents password hash leakage in generic queries
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, 'Please provide a valid phone number'],
    },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      trim: true,
      uppercase: true,
      // Normalizes Unicode minus signs (U+2212) to standard ASCII hyphens
      set: (val) => (typeof val === 'string' ? val.replace(/\u2212/g, '-').trim().toUpperCase() : val),
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        message: '{VALUE} is not a valid blood group',
      },
    },
    district: {
      type: String,
      default: 'Kamareddy',
      trim: true,
    },
    status: {
      type: String,
      default: 'Active',
      enum: ['Active', 'Suspended', 'Pending'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },

    // Auth & OTP security fields (hidden from default queries)
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    loginOtp: {
      type: String,
      select: false,
    },
    loginOtpExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for rapid emergency donor matching
donorSchema.index({ district: 1, bloodGroup: 1, isAvailable: 1, status: 1 });

module.exports = mongoose.models.Donor || mongoose.model('Donor', donorSchema);