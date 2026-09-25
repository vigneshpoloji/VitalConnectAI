const mongoose = require('mongoose');

const bloodCampSchema = new mongoose.Schema(
  {
    campName: { type: String, required: true, trim: true },
    organizer: { type: String, required: true, trim: true },
    preferredDate: { type: Date, required: true },
    expectedDonors: { type: Number, default: 50 },
    venue: { type: String, required: true, trim: true },
    district: { type: String, default: 'Kamareddy' },
    status: {
      type: String,
      enum: ['Pending Review', 'Medically Verified', 'Active Today', 'Completed'],
      default: 'Pending Review',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BloodCamp || mongoose.model('BloodCamp', bloodCampSchema);