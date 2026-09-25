const express = require('express');
const BloodCamp = require('../models/bloodCamp_model');
const BloodRequest = require('../models/bloodRequest_model');
const Donor = require('../models/donor_model');
const Hospital = require('../models/hospital_model');
const BloodBank = require('../models/bloodBank_model');
const Admin = require('../models/admin_model');
const verifyToken = require('../middleware/auth_middleware');
const { logAuditEvent } = require('./audit_routes');

const router = express.Router();

const PENDING_STATUSES = ['Pending', 'Pending Review', 'pending'];

// ==========================================
// 1. Analytics & Metrics
// ==========================================
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const [totalDonors, totalHospitals, totalBanks, pendingCamps, openRequests] =
      await Promise.all([
        Donor.countDocuments(),
        Hospital.countDocuments(),
        BloodBank.countDocuments(),
        BloodCamp.countDocuments({ status: { $in: PENDING_STATUSES } }),
        BloodRequest.countDocuments({ status: 'Open' }),
      ]);

    return res.json({
      success: true,
      metrics: {
        totalDonors,
        totalHospitals,
        totalBanks,
        pendingCamps,
        openRequests,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. Aggregated User Directory Management
// ==========================================
router.get('/users', verifyToken, async (req, res) => {
  try {
    const [donors, hospitals, bloodBanks] = await Promise.all([
      Donor.find().select('-password').lean(),
      Hospital.find().select('-password').lean(),
      BloodBank.find().select('-password').lean(),
    ]);

    const formattedDonors = donors.map((d) => ({
      ...d,
      id: d._id,
      name: d.fullName,
      role: 'Donor',
      district: d.district || 'Kamareddy',
      status: d.status || 'Active',
    }));

    const formattedHospitals = hospitals.map((h) => ({
      ...h,
      id: h._id,
      name: h.hospitalName,
      role: 'Hospital',
      district: h.district || 'Kamareddy',
      status: h.status || 'Active',
    }));

    const formattedBanks = bloodBanks.map((b) => ({
      ...b,
      id: b._id,
      name: b.facilityName,
      role: 'Blood Bank',
      district: b.district || 'Kamareddy',
      status: b.status || 'Active',
    }));

    const allUsers = [
      ...formattedDonors,
      ...formattedHospitals,
      ...formattedBanks,
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return res.json({ success: true, count: allUsers.length, users: allUsers });
  } catch (error) {
    console.error('[Admin /users Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Active' | 'Suspended' | 'Pending'

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    let user = await BloodBank.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) user = await Hospital.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) user = await Donor.findByIdAndUpdate(id, { status }, { new: true });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User record not found in MongoDB' });
    }

    // Trigger standardized audit log event
    await logAuditEvent({
      action: status === 'Suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      performedBy: {
        id: req.user?.id || req.user?._id,
        name: req.user?.name || 'Administrator',
        role: 'Admin',
      },
      target: {
        entity: user.facilityName || user.hospitalName || user.fullName || user.email,
        district: user.district || 'Kamareddy',
      },
      details: `Account ${user.email || id} marked as ${status}. Real-time session eviction triggered.`,
      severity: status === 'Suspended' ? 'warning' : 'info',
    });

    return res.json({
      success: true,
      message: `Account marked as ${status}`,
      user,
    });
  } catch (err) {
    console.error('[Admin Status Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. Camp Management
// ==========================================
router.get('/camps/pending', verifyToken, async (req, res) => {
  try {
    const pendingCamps = await BloodCamp.find({
      status: { $in: PENDING_STATUSES },
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: pendingCamps.length,
      camps: pendingCamps,
    });
  } catch (error) {
    console.error('[Admin Pending Camps Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/camps/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const updatedCamp = await BloodCamp.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedCamp) {
      return res.status(404).json({ success: false, message: 'Camp proposal not found' });
    }

    // Record CAMP_VERIFIED audit log when verified/approved
    if (['Verified', 'Approved'].includes(status)) {
      await logAuditEvent({
        action: 'CAMP_VERIFIED',
        performedBy: {
          id: req.user?.id || req.user?._id,
          name: req.user?.name || 'Administrator',
          role: 'Admin',
        },
        target: {
          entity: updatedCamp.campName || updatedCamp.organizationName || 'Blood Camp',
          district: updatedCamp.district || 'Kamareddy',
        },
        details: `Camp proposal "${updatedCamp.campName || req.params.id}" status updated to ${status}.`,
        severity: 'info',
      });
    }

    return res.json({
      success: true,
      message: `Camp status updated to ${status}`,
      camp: updatedCamp,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;