const express = require('express');
const router = express.Router();
const BloodBatch = require('../models/bloodBatch_model');
const BloodBank = require('../models/bloodBank_model');

// GET /api/inventory/batches/:bloodBankId
// Fetches batches and automatically tags impending expirations
router.get('/batches/:bloodBankId', async (req, res) => {
  try {
    const { bloodBankId } = req.params;
    const now = new Date();
    const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const batches = await BloodBatch.find({ bloodBankId, status: { $ne: 'Discarded' } }).sort({ expiryDate: 1 });

    // Update statuses dynamically
    for (const batch of batches) {
      if (batch.expiryDate <= now && batch.status !== 'Expired') {
        batch.status = 'Expired';
        await batch.save();
      } else if (batch.expiryDate <= threeDaysAhead && batch.expiryDate > now && batch.status !== 'Expiring Soon') {
        batch.status = 'Expiring Soon';
        await batch.save();
      }
    }

    return res.json({ success: true, batches });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory/batches/add
router.post('/batches/add', async (req, res) => {
  try {
    const { bloodBankId, bloodGroup, componentType = 'Whole Blood', unitsCount = 1, shelfLifeDays = 35, storageLocation } = req.body;

    const collectionDate = new Date();
    const expiryDate = new Date(collectionDate.getTime() + Number(shelfLifeDays) * 24 * 60 * 60 * 1000);

    const newBatch = new BloodBatch({
      bloodBankId,
      bloodGroup: bloodGroup.toUpperCase(),
      componentType,
      unitsCount: Number(unitsCount),
      collectionDate,
      expiryDate,
      storageLocation: storageLocation || 'Refrigerated Bay 1',
      status: 'Available',
    });

    await newBatch.save();

    // Increment overall blood bank stockUnits in sync
    const bank = await BloodBank.findById(bloodBankId);
    if (bank && bank.stockUnits) {
      const current = typeof bank.stockUnits.get === 'function'
        ? (bank.stockUnits.get(bloodGroup.toUpperCase()) || 0)
        : (bank.stockUnits[bloodGroup.toUpperCase()] || 0);

      const updated = current + Number(unitsCount);
      if (typeof bank.stockUnits.set === 'function') {
        bank.stockUnits.set(bloodGroup.toUpperCase(), updated);
      } else {
        bank.stockUnits[bloodGroup.toUpperCase()] = updated;
      }
      await bank.save();
    }

    return res.json({ success: true, batch: newBatch });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory/batches/:id/discard
router.post('/batches/:id/discard', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Shelf-life expiration' } = req.body;

    const batch = await BloodBatch.findById(id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found.' });

    batch.status = 'Discarded';
    batch.discardReason = reason;
    await batch.save();

    // Deduct discarded units from live public inventory
    const bank = await BloodBank.findById(batch.bloodBankId);
    if (bank && bank.stockUnits) {
      const current = typeof bank.stockUnits.get === 'function'
        ? (bank.stockUnits.get(batch.bloodGroup) || 0)
        : (bank.stockUnits[batch.bloodGroup] || 0);

      const remaining = Math.max(0, current - batch.unitsCount);
      if (typeof bank.stockUnits.set === 'function') {
        bank.stockUnits.set(batch.bloodGroup, remaining);
      } else {
        bank.stockUnits[batch.bloodGroup] = remaining;
      }
      await bank.save();
    }

    return res.json({ success: true, message: 'Batch securely discarded and removed from public stock.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;