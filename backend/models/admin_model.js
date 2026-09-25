const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    role: { type: String, default: 'Admin' },
    adminName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    adminMfaCode: { type: String, required: true, length: 6 },
    accessTier: { 
      type: String, 
      enum: ['SuperAdmin', 'Moderator'], 
      default: 'Moderator' 
    },
    // Only you have this enabled by default
    isAuthorizedBySuperAdmin: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);