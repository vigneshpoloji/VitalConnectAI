const mongoose = require('mongoose');

const crossMatchVerificationSchema = new mongoose.Schema({
  crossMatchCompleted: { type: Boolean, default: false },
  crossMatchMethod: { type: String, default: 'Indirect Antiglobulin Test (IAT)' },
  infectionMarkersCleared: { type: Boolean, default: false },
  verifiedByNurse: { type: String, default: '' },
  verifiedByDoctor: { type: String, default: '' },
  verifiedAt: { type: Date, default: null },
  transfusionNotes: { type: String, default: '' },
});

const bloodRequestSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    hospitalName: { type: String, required: true },
    bloodGroup: { type: String, required: true },
    component: { type: String, default: 'Packed RBC' },
    unitsRequired: { type: Number, required: true },
    units: { type: Number, default: 1 },
    urgencyLevel: {
      type: String,
      default: 'Critical',
    },
    ward: { type: String, default: 'Emergency Ward' },
    district: { type: String, required: true },
    patientCondition: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    status: {
      type: String,
      enum: [
        'Pending Verification',
        'Pending',
        'Open',
        'Dispatched',
        'In Transit',
        'Delivered',
        'Fulfilled',
        'Completed',
        'Cancelled',
      ],
      default: 'Pending Verification',
    },
    fulfilledBy: { type: String, default: null },
    fulfilledAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    clinicalVerification: {
      type: crossMatchVerificationSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);