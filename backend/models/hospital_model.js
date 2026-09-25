const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    role: { type: String, default: 'Hospital' },
    hospitalName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    licenseNumber: { type: String, required: true, trim: true },
    cmoPin: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    district: { type: String, default: 'Kamareddy', trim: true },
    emergencyHotline: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);