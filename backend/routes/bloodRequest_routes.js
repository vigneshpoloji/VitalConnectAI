const express = require('express');
const BloodRequest = require('../models/bloodRequest_model');
const Donor = require('../models/donor_model');
const BloodBank = require('../models/bloodBank_model');
const verifyToken = require('../middleware/auth_middleware');
const { broadcastEmergencyWebPush } = require('./push_routes');

const router = express.Router();

// Compatibility map: Key = Donor's group, Value = Recipient groups this donor can donate to
const DONOR_CAN_DONATE_TO = {
  'O−': ['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+'],
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A−': ['A−', 'A+', 'AB−', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B−': ['B−', 'B+', 'AB−', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB−': ['AB−', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

// ============================================================================
// 1. GET Blood Requests
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { bloodGroup, donorBloodGroup, district, status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (district && district.trim()) {
      query.district = new RegExp(`^${district.trim()}$`, 'i');
    }

    if (donorBloodGroup && DONOR_CAN_DONATE_TO[donorBloodGroup]) {
      query.bloodGroup = { $in: DONOR_CAN_DONATE_TO[donorBloodGroup] };
    } else if (bloodGroup) {
      const cleanGroup = bloodGroup.replace('−', '-');
      const unicodeGroup = bloodGroup.replace('-', '−');
      query.bloodGroup = { $in: [cleanGroup, unicodeGroup] };
    }

    let requests = await BloodRequest.find(query).sort({ createdAt: -1 });

    if (requests.length === 0 && district) {
      delete query.district;
      requests = await BloodRequest.find(query).sort({ createdAt: -1 });
    }

    return res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('[Get Requests Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 2. Core Request Creation Handler
// ============================================================================
const handleCreateRequest = async (req, res) => {
  try {
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

    if (!bloodGroup) {
      return res.status(400).json({
        success: false,
        message: 'Blood group is mandatory',
      });
    }

    const normalizedGroup = bloodGroup.replace('−', '-');
    const reqUnits = Number(unitsRequired || units || 1);
    const targetDistrict = district || req.user?.district || 'Kamareddy';
    const targetHospital =
      hospitalName ||
      req.user?.name ||
      req.user?.hospitalName ||
      'Emergency Trauma Center';

    const newRequest = await BloodRequest.create({
      hospitalId: req.user?.id || req.user?._id,
      hospitalName: targetHospital,
      bloodGroup: normalizedGroup,
      component: component || 'Packed RBC',
      unitsRequired: reqUnits,
      units: reqUnits,
      urgencyLevel: urgencyLevel || 'Critical',
      ward: ward || 'Emergency Ward',
      district: targetDistrict,
      patientCondition:
        patientCondition || 'Emergency trauma blood support requirement',
      status: 'Pending Verification',
    });

    // 1. Emit real-time WebSocket event to the target district room
    const io = req.app.get('io');
    if (io) {
      io.to(targetDistrict.toLowerCase()).emit('new_emergency_broadcast', {
        requestId: newRequest._id,
        hospitalName: targetHospital,
        bloodGroup: normalizedGroup,
        unitsRequired: reqUnits,
        urgencyLevel: newRequest.urgencyLevel,
        district: targetDistrict,
        createdAt: newRequest.createdAt,
      });
    }

    // 2. Asynchronous WebPush dispatch
    if (typeof broadcastEmergencyWebPush === 'function') {
      broadcastEmergencyWebPush({
        hospitalName: targetHospital,
        district: targetDistrict,
        bloodGroup: normalizedGroup,
        unitsRequired: reqUnits,
      }).catch((e) => console.warn('WebPush error:', e.message));
    }

    return res.status(201).json({
      success: true,
      message: 'Emergency request broadcast successfully',
      request: newRequest,
    });
  } catch (error) {
    console.error('[Create Request Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/', verifyToken, handleCreateRequest);
router.post('/create', verifyToken, handleCreateRequest);

// ============================================================================
// 3. Clinical Cross-Match & Transfusion Sign-Off Endpoint
// @route POST /api/blood-requests/:id/verify-transfusion
// ============================================================================
router.post('/:id/verify-transfusion', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      crossMatchCompleted,
      crossMatchMethod,
      infectionMarkersCleared,
      verifiedByNurse,
      verifiedByDoctor,
      transfusionNotes,
    } = req.body;

    if (!crossMatchCompleted || !infectionMarkersCleared) {
      return res.status(400).json({
        success: false,
        message: 'Both cross-match testing and infection screening must be completed prior to transfusion.',
      });
    }

    if (!verifiedByNurse || !verifiedByDoctor) {
      return res.status(400).json({
        success: false,
        message: 'Two-person clinical sign-off (Attending Doctor & Staff Nurse) is required by law.',
      });
    }

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    }

    request.clinicalVerification = {
      crossMatchCompleted: true,
      crossMatchMethod: crossMatchMethod || 'Indirect Antiglobulin Test (IAT)',
      infectionMarkersCleared: true,
      verifiedByNurse,
      verifiedByDoctor,
      verifiedAt: new Date(),
      transfusionNotes: transfusionNotes || 'Safe cross-match confirmed without agglutination.',
    };

    request.status = 'Delivered';
    request.deliveredAt = request.deliveredAt || new Date();
    await request.save();

    // Broadcast verification event via WebSockets
    const io = req.app.get('io');
    if (io && request.district) {
      io.to(request.district.toLowerCase()).emit('clinical_transfusion_verified', {
        requestId: request._id,
        hospitalName: request.hospitalName,
        clinicalVerification: request.clinicalVerification,
      });
    }

    return res.json({
      success: true,
      message: 'Clinical cross-match verified. Blood unit approved for patient transfusion.',
      request,
    });
  } catch (err) {
    console.error('[Verification Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 4. Donor Response Endpoint
// ============================================================================
router.post('/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { donorId, donorName, donorPhone, etaMinutes = 30 } = req.body;

    if (!donorName || !donorPhone) {
      return res.status(400).json({
        success: false,
        message: 'Donor name and contact number are required.',
      });
    }

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    }

    if (!request.respondingDonors) {
      request.respondingDonors = [];
    }

    const alreadyResponded = request.respondingDonors.some(
      (d) => d.donorPhone === donorPhone
    );

    if (alreadyResponded) {
      return res.status(400).json({
        success: false,
        message: 'You have already confirmed response to this emergency.',
      });
    }

    const commitment = {
      donorId: donorId || null,
      donorName,
      donorPhone,
      etaMinutes: Number(etaMinutes),
      respondedAt: new Date(),
    };

    request.respondingDonors.push(commitment);
    await request.save();

    const io = req.app.get('io');
    if (io && request.district) {
      io.to(request.district.toLowerCase()).emit('donor_responded_sync', {
        requestId: request._id,
        hospitalName: request.hospitalName,
        donor: commitment,
      });
    }

    return res.json({
      success: true,
      message: `Commitment logged! ${request.hospitalName} trauma station has been alerted that you are arriving in ~${etaMinutes} mins.`,
      request,
    });
  } catch (err) {
    console.error('[Donor Response Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 5. Complete Donation & Cooldown Trigger
// ============================================================================
router.post('/:id/complete-donation', async (req, res) => {
  try {
    const { id } = req.params;
    const { donorId, unitsDonated = 1 } = req.body;

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (donorId) {
      let donor = await Donor.findById(donorId);
      if (!donor) {
        try {
          const User = require('../models/user_model');
          donor = await User.findById(donorId);
        } catch (_) {}
      }

      if (donor) {
        donor.lastDonatedDate = new Date();
        donor.totalDonationsCount = (donor.totalDonationsCount || 0) + Number(unitsDonated);
        donor.isAvailable = false;
        await donor.save();
      }
    }

    request.status = 'Fulfilled';
    request.deliveredAt = request.deliveredAt || new Date();
    await request.save();

    return res.json({
      success: true,
      message: 'Donation successfully verified. 90-day recovery protocol initiated.',
      request,
    });
  } catch (err) {
    console.error('[Complete Donation Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 6. Dispatch & Stock Sync Endpoint
// ============================================================================
router.post('/:id/dispatch', async (req, res) => {
  try {
    const { id } = req.params;
    const { bloodBankId, dispatchedUnits } = req.body;

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    }

    const bankId = bloodBankId || req.user?.bloodBankId || req.user?.id;
    const bank = await BloodBank.findById(bankId);
    if (!bank) {
      return res.status(404).json({ success: false, message: 'Fulfilling blood bank not found.' });
    }

    const group = (request.bloodGroup || 'O+').trim().replace('−', '-').toUpperCase();
    const unitsToDeduct = Number(dispatchedUnits) || Number(request.unitsRequired) || 1;

    let currentStock = 0;
    if (bank.stockUnits) {
      currentStock = typeof bank.stockUnits.get === 'function'
        ? (bank.stockUnits.get(group) || 0)
        : (bank.stockUnits[group] || 0);
    }

    if (currentStock < unitsToDeduct) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock in ${bank.facilityName || 'selected facility'}. Available: ${currentStock}, Requested: ${unitsToDeduct}`,
      });
    }

    const updatedStock = currentStock - unitsToDeduct;
    if (typeof bank.stockUnits.set === 'function') {
      bank.stockUnits.set(group, updatedStock);
    } else {
      bank.stockUnits[group] = updatedStock;
    }
    await bank.save();

    request.status = 'Dispatched';
    request.fulfilledBy = bank.facilityName || bank.name || 'Blood Bank Partner';
    request.fulfilledAt = new Date();
    await request.save();

    const io = req.app.get('io');
    if (io && request.district) {
      io.to(request.district.toLowerCase()).emit('stock_dispatched_sync', {
        requestId: request._id,
        bloodGroup: group,
        dispatchedUnits: unitsToDeduct,
        remainingStock: updatedStock,
        hospitalName: request.hospitalName,
        facilityName: bank.facilityName,
        status: 'Dispatched',
      });
    }

    return res.json({
      success: true,
      message: `Successfully dispatched ${unitsToDeduct} unit(s) of ${group} to ${request.hospitalName}.`,
      remainingStock: updatedStock,
      requestStatus: request.status,
      request,
    });
  } catch (err) {
    console.error('[Dispatch Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 7. Progress Transit Status Endpoint
// ============================================================================
router.patch('/:id/progress-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { nextStatus } = req.body;

    const allowed = [
      'Pending Verification',
      'Open',
      'Dispatched',
      'In Transit',
      'Delivered',
      'Fulfilled',
      'Completed',
      'Cancelled',
    ];

    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status update. Allowed values: ${allowed.join(', ')}`,
      });
    }

    const updateFields = { status: nextStatus };

    if (nextStatus === 'Delivered' || nextStatus === 'Fulfilled') {
      updateFields.deliveredAt = new Date();
    } else if (nextStatus === 'Dispatched') {
      updateFields.fulfilledAt = new Date();
    }

    const updatedRequest = await BloodRequest.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: false }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const io = req.app.get('io');
    if (io && updatedRequest.district) {
      io.to(updatedRequest.district.toLowerCase()).emit('request_transit_updated', {
        requestId: updatedRequest._id,
        status: nextStatus,
        deliveredAt: updatedRequest.deliveredAt,
      });
    }

    return res.json({
      success: true,
      message: `Status updated to ${nextStatus}`,
      request: updatedRequest,
    });
  } catch (err) {
    console.error('[Progress Status Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 8. Fulfill Blood Request
// ============================================================================
router.patch('/:id/fulfill', verifyToken, async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    request.status = 'Fulfilled';
    request.deliveredAt = request.deliveredAt || new Date();
    await request.save();

    return res.json({
      success: true,
      message: 'Request fulfilled and logged successfully',
      request,
    });
  } catch (error) {
    console.error('[Fulfill Request Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;