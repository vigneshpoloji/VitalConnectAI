const express = require('express');
const jwt = require('jsonwebtoken');
const BloodRequest = require('../models/bloodRequest_model');
const Hospital = require('../models/hospital_model');
const Donor = require('../models/donor_model');
const verifyToken = require('../middleware/auth_middleware');
const { logAuditEvent } = require('./audit_routes');

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

// Optional token extractor helper
const getOptionalUser = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      return jwt.verify(token, process.env.JWT_SECRET || 'vitalconnect_fallback_secret');
    }
  } catch (e) {
    // Token invalid or absent; continue without crashing
  }
  return null;
};

// ============================================================================
// 1. POST Handler for both '/' and '/create'
// ============================================================================
const handleCreateRequest = async (req, res) => {
  try {
    const decodedUser = req.user || getOptionalUser(req);
    const {
      hospitalName,
      bloodGroup,
      component,
      unitsRequired,
      units,
      urgencyLevel,
      district,
      ward,
      patientCondition,
    } = req.body;

    console.log('\n--- [CREATE BLOOD REQUEST INCOMING] ---');
    console.log('Payload:', req.body);

    if (!bloodGroup) {
      return res.status(400).json({ success: false, message: 'Blood group is required' });
    }

    const cleanGroup = bloodGroup.toString().replace('−', '-').trim();
    const count = Number(unitsRequired || units || 1);
    const targetDistrict = district || decodedUser?.district || 'Kamareddy';
    const effectiveHospitalName = hospitalName || decodedUser?.name || decodedUser?.hospitalName || 'General Trauma Hospital';
    const effectiveWard = ward || 'Trauma ICU';

    const newDoc = await BloodRequest.create({
      hospitalId: decodedUser?.id || decodedUser?._id || undefined,
      hospitalName: effectiveHospitalName,
      bloodGroup: cleanGroup,
      component: component || 'Packed RBC',
      unitsRequired: count,
      units: count,
      urgencyLevel: urgencyLevel || 'Critical',
      ward: effectiveWard,
      district: targetDistrict,
      patientCondition: patientCondition || 'Emergency trauma patient requirement',
      status: 'Pending',
    });

    console.log(`[REQUEST CREATED SUCCESS]: ID ${newDoc._id} for ${newDoc.hospitalName}`);

    // 1. Audit log: EMERGENCY_BROADCAST
    await logAuditEvent({
      action: 'EMERGENCY_BROADCAST',
      performedBy: {
        id: decodedUser?.id || decodedUser?._id || null,
        name: effectiveHospitalName,
        role: decodedUser?.role || 'Hospital',
      },
      target: {
        entity: `${cleanGroup} (${count} Units)`,
        district: targetDistrict,
      },
      details: `${effectiveHospitalName} broadcast emergency SOS for ${count} unit(s) of ${cleanGroup} (${effectiveWard}).`,
      severity: 'critical',
    });

    // 2. Multi-channel district notifications
    try {
      await Promise.all([
        createNotification({
          recipientRole: 'bloodbank',
          district: targetDistrict,
          title: `Urgent Requirement: ${cleanGroup} Blood`,
          body: `${effectiveHospitalName} requested ${count} units of ${cleanGroup} for ${effectiveWard}.`,
          type: 'critical',
        }),
        createNotification({
          recipientRole: 'donor',
          district: targetDistrict,
          title: `Critical Need for ${cleanGroup} Donors`,
          body: `Emergency patient requirement at ${effectiveHospitalName}. Check Live Requests to respond.`,
          type: 'critical',
        }),
      ]);
    } catch (notifErr) {
      console.warn('[Notification Dispatch Warning]:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Emergency request broadcast successfully',
      request: newDoc,
    });
  } catch (error) {
    console.error('[Create Blood Request Fatal Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Database validation failure creating blood request',
    });
  }
};

router.post('/', handleCreateRequest);
router.post('/create', handleCreateRequest);

// ============================================================================
// 2. GET Requests (Filterable by status, district, bloodGroup)
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { status, bloodGroup, district } = req.query;
    const query = {};

    if (status) query.status = status;
    if (district && district.trim()) {
      query.district = new RegExp(`^${district.trim()}$`, 'i');
    }

    if (bloodGroup) {
      const g = bloodGroup.replace('−', '-');
      const unicodeG = bloodGroup.replace('-', '−');
      query.bloodGroup = { $in: [g, unicodeG] };
    }

    const requests = await BloodRequest.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, requests: [] });
  }
});

// ============================================================================
// 3. PATCH Donor Fulfill Endpoint
// @route PATCH /api/requests/:id/fulfill
// ============================================================================
router.patch('/:id/fulfill', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BloodRequest.findById(id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Emergency request not found' });
    }

    if (request.status === 'Fulfilled' || request.status === 'Dispatched') {
      return res.status(400).json({ success: false, message: 'Request has already been fulfilled' });
    }

    // Update request state and record fulfilledBy
    request.status = 'Fulfilled';
    request.fulfilledBy = {
      donorId: req.user.id,
      donorName: req.user.name || req.user.fullName || 'Anonymous Donor',
      fulfilledAt: new Date(),
    };
    request.markModified('fulfilledBy');
    await request.save();

    // Update Donor lastDonationDate if role is Donor
    if ((req.user.role || '').toLowerCase() === 'donor') {
      await Donor.findByIdAndUpdate(req.user.id, {
        lastDonationDate: new Date(),
      });
    }

    // Audit log: DONOR_FULFILLMENT
    await logAuditEvent({
      action: 'DONOR_FULFILLMENT',
      performedBy: {
        id: req.user.id,
        name: req.user.name || req.user.fullName || 'Registered Donor',
        role: 'Donor',
      },
      target: {
        entity: request.hospitalName || 'Emergency Request',
        district: request.district || 'Kamareddy',
      },
      details: `Donor accepted and fulfilled emergency request for ${request.bloodGroup} at ${request.hospitalName}.`,
      severity: 'info',
    });

    console.log(`[DONOR RESPONSE]: Request ${id} fulfilled by donor ${req.user.email || req.user.id}`);

    return res.json({
      success: true,
      message: `Thank you! Your donation response has been confirmed for ${request.hospitalName}.`,
      request,
    });
  } catch (error) {
    console.error('[Donor Fulfill Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;