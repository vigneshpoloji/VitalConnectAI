const mongoose = require('mongoose');

const bloodBatchSchema = new mongoose.Schema({
  bloodBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodBank', required: true },
  bloodGroup: { type: String, required: true }, // 'O+', 'A-', etc.
  componentType: { type: String, enum: ['Whole Blood', 'PRBC', 'Platelets', 'FFP'], default: 'Whole Blood' },
  unitsCount: { type: Number, required: true, default: 1 },
  collectionDate: { type: Date, required: true, default: Date.now },
  expiryDate: { type: Date, required: true },
  storageLocation: { type: String, default: 'Cold Room Unit A' },
  status: { type: String, enum: ['Available', 'Expiring Soon', 'Expired', 'Discarded'], default: 'Available' },
  discardReason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BloodBatch', bloodBatchSchema);