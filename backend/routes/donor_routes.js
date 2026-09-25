const express = require('express');
const Donor = require('../models/donor_model');
const router = express.Router();

// GET /api/donors?district=Kamareddy
router.get('/', async (req, res) => {
  try {
    const { district, bloodGroup } = req.query;
    const query = {};

    if (district) {
      query.district = new RegExp(`^${district.trim()}$`, 'i');
    }

    if (bloodGroup) {
      const ascii = bloodGroup.replace('−', '-');
      const unicode = bloodGroup.replace('-', '−');
      query.bloodGroup = { $in: [ascii, unicode] };
    }

    const donors = await Donor.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: donors.length,
      donors,
    });
  } catch (error) {
    console.error('[Donor Fetch Error]:', error);
    return res.status(500).json({ success: false, message: error.message, donors: [] });
  }
});

module.exports = router;