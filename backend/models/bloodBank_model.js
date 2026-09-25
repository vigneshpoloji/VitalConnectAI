const mongoose = require('mongoose');

const bloodBankSchema = new mongoose.Schema(
  {
    role: { type: String, default: 'Blood Bank' },
    facilityName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    registrationNumber: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    district: { type: String, default: 'Kamareddy', trim: true },
    status: {
      type: String,
      default: 'Active',
      enum: ['Active', 'Pending', 'Suspended'],
      trim: true,
    },
    stockUnits: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        'O+': 24,
        'O-': 4,
        'A+': 18,
        'A-': 7,
        'B+': 21,
        'B-': 6,
        'AB+': 10,
        'AB-': 3,
      }),
    },
  },
  { timestamps: true }
);

// At the bottom of backend/models/bloodBank_model.js
module.exports = mongoose.models.BloodBank || mongoose.model('BloodBank', bloodBankSchema);