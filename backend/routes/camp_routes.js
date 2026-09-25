// backend/routes/camp_routes.js

const express = require('express');
const BloodCamp = require('../models/bloodCamp_model');
const verifyToken = require('../middleware/auth_middleware');

// Safely require notification helper if present
let createNotification = async () => {};
try {
  const notifModule = require('./notification_routes');
  if (typeof notifModule.createNotification === 'function') {
    createNotification = notifModule.createNotification;
  }
} catch (e) {
  console.warn('[Notification Helper]: notification_routes not detected or exported, skipping push alert.');
}

const router = express.Router();

// ============================================================================
// 1. Fetch all camps (Supports district filter and verified status)
// @route GET /api/camps
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { district, status } = req.query;
    const query = {};

    if (district) {
      query.district = new RegExp(`^${district.trim()}$`, 'i');
    }

    if (status) {
      query.status = status;
    }

    const camps = await BloodCamp.find(query).sort({ preferredDate: 1 });
    return res.json({ success: true, count: camps.length, camps });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 2. Fetch pending camps for Admin review
// @route GET /api/camps/pending
// ============================================================================
router.get('/pending', async (req, res) => {
  try {
    const camps = await BloodCamp.find({ status: 'Pending Review' }).sort({ createdAt: -1 });
    return res.json({ success: true, count: camps.length, camps });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 3. Host / Submit a new camp proposal
// @route POST /api/camps/host
// ============================================================================
router.post('/host', async (req, res) => {
  try {
    const { campName, organizer, preferredDate, expectedDonors, venue, district } = req.body;

    if (!campName || !organizer || !preferredDate || !venue) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const newCamp = await BloodCamp.create({
      campName,
      organizer,
      preferredDate: new Date(preferredDate),
      expectedDonors: Number(expectedDonors) || 50,
      venue,
      district: district || 'Kamareddy',
      status: 'Pending Review',
      attendees: [],
    });

    // Notify administrators of incoming community drive proposal
    try {
      await createNotification({
        recipientRole: 'admin',
        district: newCamp.district,
        title: 'New Blood Camp Proposed',
        body: `${organizer} submitted "${campName}" in ${venue} for verification.`,
        type: 'info',
      });
    } catch (notifErr) {
      console.warn('[Camp Proposal Notif Warning]:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Blood donation camp proposal submitted for medical verification.',
      camp: newCamp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 4. Book / Reserve a Donation Slot at a Specific Camp
// @route POST /api/camps/:id/book-slot
// ============================================================================
router.post('/:id/book-slot', async (req, res) => {
  try {
    const { id } = req.params;
    const { donorName, donorPhone, donorBloodGroup, slotTime } = req.body;

    if (!donorName || !donorPhone || !slotTime) {
      return res.status(400).json({
        success: false,
        message: 'Name, contact number, and preferred time slot are required.',
      });
    }

    const camp = await BloodCamp.findById(id);

    if (!camp) {
      return res.status(404).json({ success: false, message: 'Blood camp not found.' });
    }

    // Initialize attendees array if not yet present
    if (!Array.isArray(camp.attendees)) {
      camp.attendees = [];
    }

    // Prevent duplicate booking for the same donor contact number
    const existing = camp.attendees.find((a) => a.donorPhone === donorPhone);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A slot has already been reserved with this contact number.',
      });
    }

    const cleanGroup = (donorBloodGroup || 'Unknown').replace('−', '-').trim();

    camp.attendees.push({
      donorName: donorName.trim(),
      donorPhone: donorPhone.trim(),
      donorBloodGroup: cleanGroup,
      slotTime: slotTime.trim(),
      bookedAt: new Date(),
    });

    camp.markModified('attendees');
    await camp.save();

    // Trigger internal alert for camp organizers/admin monitoring
    try {
      await createNotification({
        recipientRole: 'admin',
        district: camp.district,
        title: 'New Camp Slot Reserved',
        body: `${donorName} (${cleanGroup}) booked a donation slot at ${camp.campName} for ${slotTime}.`,
        type: 'success',
      });
    } catch (notifErr) {
      console.warn('[Camp Booking Notif Warning]:', notifErr.message);
    }

    return res.json({
      success: true,
      message: `Slot reserved successfully for ${donorName} at ${camp.campName}!`,
      totalBookings: camp.attendees.length,
      camp,
    });
  } catch (err) {
    console.error('[Camp Booking Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 5. Admin updates camp status (Verify, Activate, Complete, Decline)
// @route PATCH /api/camps/:id/status
// ============================================================================
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      'Pending Review',
      'Medically Verified',
      'Active Today',
      'Completed',
      'Rejected',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid camp status' });
    }

    const camp = await BloodCamp.findByIdAndUpdate(id, { status }, { new: true });
    if (!camp) {
      return res.status(404).json({ success: false, message: 'Camp record not found' });
    }

    // Broadcast community alert when a camp is verified or activated
    if (status === 'Medically Verified' || status === 'Active Today') {
      try {
        await createNotification({
          recipientRole: 'donor',
          district: camp.district,
          title: `Blood Camp Confirmed: ${camp.campName}`,
          body: `A verified donation drive will take place at ${camp.venue}. Reserve your slot today!`,
          type: 'info',
        });
      } catch (notifErr) {
        console.warn('[Camp Status Notif Warning]:', notifErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Camp marked as ${status}`,
      camp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;