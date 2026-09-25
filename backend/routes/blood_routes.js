const express = require('express');
const BloodBank = require('../models/bloodBank_model');
const verifyToken = require('../middleware/auth_middleware');

const router = express.Router();

// 1. Authenticated endpoint: Get currently logged-in Blood Bank's profile & stock
router.get('/me', verifyToken, async (req, res) => {
  try {
    const bank = await BloodBank.findById(req.user.id).select('-password');
    if (!bank) {
      return res.status(404).json({ success: false, message: 'Blood bank facility not found' });
    }
    return res.json({
      success: true,
      bank,
      stockUnits: bank.stockUnits || {},
    });
  } catch (error) {
    console.error('[BloodBank /me Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Public / Network endpoint: District inventory lookup
router.get('/inventory', async (req, res) => {
  try {
    const { district } = req.query;
    const query = district ? { district: new RegExp(`^${district.trim()}$`, 'i') } : {};

    const banks = await BloodBank.find(query).select('-password');
    return res.json({ success: true, count: banks.length, banks });
  } catch (error) {
    console.error('[BloodBank /inventory Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Update stock units in MongoDB via + / - steppers
router.patch('/inventory/update', verifyToken, async (req, res) => {
  try {
    const { bloodGroup, deltaUnits } = req.body;

    if (!bloodGroup || deltaUnits === undefined) {
      return res.status(400).json({ success: false, message: 'bloodGroup and deltaUnits are required' });
    }

    // Normalize hyphen to standard ASCII '-'
    const cleanKey = bloodGroup.replace('−', '-');
    const updatePath = `stockUnits.${cleanKey}`;

    const updatedBank = await BloodBank.findByIdAndUpdate(
      req.user.id,
      { $inc: { [updatePath]: Number(deltaUnits) } },
      { new: true }
    ).select('-password');

    if (!updatedBank) {
      return res.status(404).json({ success: false, message: 'Blood bank record not found' });
    }

    // Prevent stock from going below 0
    if (updatedBank.stockUnits && updatedBank.stockUnits[cleanKey] < 0) {
      updatedBank.stockUnits[cleanKey] = 0;
      await updatedBank.save();
    }

    return res.json({
      success: true,
      message: 'MongoDB inventory updated successfully',
      stockUnits: updatedBank.stockUnits,
    });
  } catch (error) {
    console.error('[BloodBank /inventory/update Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;