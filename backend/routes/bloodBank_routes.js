// backend/routes/bloodBank_routes.js

const express = require('express');
const mongoose = require('mongoose');
const BloodBank = require('../models/bloodBank_model');
const BloodRequest = require('../models/bloodRequest_model');
const AuditLog = require('../models/auditLog_model');
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

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const CRITICAL_THRESHOLD = 3;

/**
 * Helper to safely log audit events without interrupting the primary operational flow
 */
const safeAuditLog = async (logData) => {
  try {
    if (AuditLog) {
      await AuditLog.create(logData);
    }
  } catch (err) {
    console.warn('[Audit Log Warning]:', err.message);
  }
};

/**
 * Evaluates blood inventory levels against threshold and triggers notifications and audit records
 */
async function checkInventoryThresholds(bank) {
  if (!bank.stockUnits) return;

  const stockEntries =
    bank.stockUnits instanceof Map
      ? Array.from(bank.stockUnits.entries())
      : Object.entries(bank.stockUnits);

  for (const [group, count] of stockEntries) {
    const numUnits = Number(count) || 0;
    if (numUnits <= CRITICAL_THRESHOLD) {
      try {
        await createNotification({
          recipientRole: 'bloodbank',
          recipientId: bank._id ? bank._id.toString() : undefined,
          district: bank.district,
          title: `Low Stock Alert: ${group}`,
          body: `Reserve for ${group} has dropped to ${numUnits} units at ${bank.facilityName}. Immediate donor outreach advised.`,
          type: 'warning',
        });

        await createNotification({
          recipientRole: 'donor',
          district: bank.district,
          title: `Urgent Need for ${group} Donors`,
          body: `${bank.facilityName} in ${bank.district} is running low on ${group} blood (${numUnits} units remaining). Schedule a visit to donate!`,
          type: 'critical',
        });

        await logAuditEvent({
          action: 'INVENTORY_UPDATED',
          performedBy: {
            id: bank._id ? bank._id.toString() : null,
            name: bank.facilityName,
            role: 'Blood Bank',
          },
          target: {
            entity: `${group} Stock (${numUnits} units)`,
            district: bank.district || 'Kamareddy',
          },
          details: `Critical low-stock threshold reached for ${group} at ${bank.facilityName}. Automated alerts triggered.`,
          severity: 'warning',
        });
      } catch (err) {
        console.warn(`[Threshold Check Error - ${group}]:`, err.message);
      }
    }
  }
}

/**
 * Resilient lookup for authenticated BloodBank by ObjectId or Email
 */
const findBankByIdOrEmail = async (userPayload) => {
  const bankId = userPayload?.id || userPayload?._id;
  let bank = null;

  if (bankId && mongoose.Types.ObjectId.isValid(bankId)) {
    bank = await BloodBank.findById(bankId);
  }
  if (!bank && userPayload?.email) {
    bank = await BloodBank.findOne({ email: userPayload.email });
  }

  return bank;
};

// ============================================================================
// 1. Authenticated: Fetch Logged-in Profile & Stock
// @route GET /api/bloodbanks/me
// ============================================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const bank = await findBankByIdOrEmail(req.user);

    if (!bank) {
      return res.status(404).json({ success: false, message: 'Blood bank facility not found' });
    }

    if (bank.status && bank.status.toLowerCase() === 'suspended') {
      console.log(`[SUSPENDED ACCESS BLOCKED]: ${bank.facilityName} (${bank.email})`);
      return res.status(403).json({
        success: false,
        suspended: true,
        message: 'Account Suspended: Access has been revoked by Administrator.',
      });
    }

    const bankObj = bank.toObject();
    delete bankObj.password;

    return res.json({
      success: true,
      bank: bankObj,
      status: bank.status || 'Active',
      stockUnits: bank.stockUnits || {},
      ...bankObj,
    });
  } catch (error) {
    console.error('[BloodBank /me Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 2. Public / Discovery: Locations Autocomplete Suggestions
// @route GET /api/bloodbanks/locations?q=kam
// ============================================================================
router.get('/locations', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const cleanQ = q.trim();

    if (!cleanQ || cleanQ.length < 1) {
      return res.json({ success: true, suggestions: [] });
    }

    const regex = new RegExp(cleanQ, 'i');

    const banks = await BloodBank.find(
      {
        status: { $ne: 'Suspended' },
        $or: [{ district: regex }, { city: regex }, { address: regex }],
      },
      'district city address'
    ).limit(10);

    const suggestionsSet = new Set();

    banks.forEach((b) => {
      if (b.district && regex.test(b.district)) suggestionsSet.add(b.district);
      if (b.city && regex.test(b.city)) suggestionsSet.add(b.city);
      if (b.address && regex.test(b.address)) {
        const parts = b.address.split(',').map((p) => p.trim());
        parts.forEach((p) => {
          if (regex.test(p)) suggestionsSet.add(p);
        });
      }
    });

    const REGIONAL_PRESETS = [
      'Kamareddy',
      'Nizamabad',
      'Gandhari',
      'Banswada',
      'Yellareddy',
      'Bodhan',
      'Armoor',
      'Hyderabad',
      'Secunderabad',
      'Medak',
      'Warangal',
    ];

    REGIONAL_PRESETS.forEach((loc) => {
      if (regex.test(loc)) suggestionsSet.add(loc);
    });

    return res.json({
      success: true,
      suggestions: Array.from(suggestionsSet).slice(0, 6),
    });
  } catch (err) {
    return res.status(500).json({ success: false, suggestions: [] });
  }
});

// ============================================================================
// 3. Public / Discovery: Multi-Token Location, Coordinates & Haversine Distance Search
// @route GET /api/bloodbanks/public-search
// ============================================================================
router.get('/public-search', async (req, res) => {
  try {
    const { bloodGroup = 'O+', location = '', district = '', lat, lng } = req.query;
    const rawSearchLoc = location || district || '';

    const cleanGroup = bloodGroup.trim().replace('−', '-').toUpperCase();
    const altGroupKey = cleanGroup.replace('-', '−');

    const cleanLoc = rawSearchLoc
      .replace(/\(.*?\)/g, '')
      .replace(
        /Use my location|Location permission denied|Geolocation not supported|Pinpointing exact location\.\.\.|Detecting district\.\.\./gi,
        ''
      )
      .trim();

    let query = { status: { $ne: 'Suspended' } };

    if (cleanLoc) {
      const tokens = cleanLoc.split(/[\s,]+/).filter(Boolean);
      const tokenRegexes = tokens.map(
        (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      );

      query.$or = [
        { district: { $in: tokenRegexes } },
        { city: { $in: tokenRegexes } },
        { address: { $in: tokenRegexes } },
      ];
    }

    let banks = await BloodBank.find(query);

    if (banks.length === 0 && cleanLoc) {
      banks = await BloodBank.find({ status: { $ne: 'Suspended' } }).limit(10);
    }

    // Haversine formula calculation
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const hasCoords = !isNaN(userLat) && !isNaN(userLng);

    const toRad = (v) => (v * Math.PI) / 180;
    const calcDistanceKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth radius in km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    let results = banks.map((bank) => {
      const stock = bank.stockUnits || {};
      let units = 0;

      if (typeof stock.get === 'function') {
        units = stock.get(cleanGroup) || stock.get(altGroupKey) || 0;
      } else {
        units = stock[cleanGroup] ?? stock[altGroupKey] ?? 0;
      }

      const resolvedPhone =
        (bank.contactNumber && bank.contactNumber !== '0000000000' && bank.contactNumber) ||
        (bank.phone && bank.phone !== '0000000000' && bank.phone) ||
        (bank.contactPhone && bank.contactPhone !== '0000000000' && bank.contactPhone) ||
        '+91 75698 76200';

      let distanceKm = null;
      if (hasCoords && bank.latitude && bank.longitude) {
        distanceKm = parseFloat(
          calcDistanceKm(userLat, userLng, bank.latitude, bank.longitude).toFixed(1)
        );
      }

      return {
        id: bank._id,
        facilityName: bank.facilityName,
        phone: resolvedPhone,
        district: bank.district || 'General District',
        city: bank.city || bank.district,
        address: bank.address || `${bank.district || 'Regional'} Medical Area`,
        availableUnits: Math.max(0, Number(units) || 0),
        distanceKm,
        latitude: bank.latitude,
        longitude: bank.longitude,
        allStock: bank.stockUnits || {},
      };
    });

    // Closest-first sorting when coordinates are provided
    if (hasCoords) {
      results.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return res.json({
      success: true,
      bloodGroup: cleanGroup,
      searchedLocation: cleanLoc || 'All Locations',
      totalBanks: results.length,
      results,
    });
  } catch (err) {
    console.error('[Public Search Error]:', err);
    return res.status(500).json({ success: false, message: err.message, results: [] });
  }
});

// ============================================================================
// 4. Public / Network: General District Inventory Lookup
// @route GET /api/bloodbanks/inventory & GET /api/bloodbanks
// ============================================================================
router.get('/inventory', async (req, res) => {
  try {
    const { district } = req.query;
    const query = district && district.trim() ? { district: new RegExp(`^${district.trim()}$`, 'i') } : {};

    const banks = await BloodBank.find(query).select('-password');
    return res.json({ success: true, count: banks.length, banks });
  } catch (error) {
    console.error('[BloodBank /inventory Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message, banks: [] });
  }
});

router.get('/', async (req, res) => {
  try {
    const { district } = req.query;
    const query = district && district.trim() ? { district: new RegExp(`^${district.trim()}$`, 'i') } : {};

    const banks = await BloodBank.find(query).select('-password');
    return res.json({ success: true, count: banks.length, banks });
  } catch (error) {
    console.error('[BloodBank / Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message, banks: [] });
  }
});

// ============================================================================
// 5. Instant Single-Unit Stepper Auto-Update (+ / -)
// @route PATCH /api/bloodbanks/inventory/update
// ============================================================================
router.patch('/inventory/update', verifyToken, async (req, res) => {
  try {
    const { bloodGroup, deltaUnits } = req.body;
    const cleanGroup = (bloodGroup || '').replace('−', '-').trim();
    const delta = Number(deltaUnits || 0);

    const bank = await findBankByIdOrEmail(req.user);
    if (!bank) {
      return res.status(404).json({ success: false, message: 'Blood bank not found' });
    }

    const currentUnits = Number(
      bank.stockUnits?.[cleanGroup] ??
      bank.stockUnits?.[cleanGroup.replace('-', '−')] ??
      0
    );

    const newTotal = Math.max(0, currentUnits + delta);

    if (!bank.stockUnits) bank.stockUnits = {};
    bank.stockUnits[cleanGroup] = newTotal;
    bank.markModified('stockUnits');
    await bank.save();

    console.log(`[STOCK UPDATED]: ${cleanGroup} changed by ${delta} to ${newTotal} for ${bank.facilityName}`);

    await safeAuditLog({
      action: 'INVENTORY_UPDATED',
      performedBy: {
        id: String(bank._id),
        name: bank.facilityName || 'Blood Bank',
        role: 'Blood Bank',
      },
      target: {
        entity: `${cleanGroup} Units`,
        district: bank.district || 'Kamareddy',
      },
      details: `Adjusted ${cleanGroup} inventory by ${delta > 0 ? `+${delta}` : delta} (New total: ${newTotal}).`,
      severity: newTotal === 0 ? 'warning' : 'info',
    });

    await checkInventoryThresholds(bank);

    return res.json({
      success: true,
      bloodGroup: cleanGroup,
      units: newTotal,
      stockUnits: bank.stockUnits,
    });
  } catch (error) {
    console.error('[Inventory Update Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 6. Save Entire Inventory Ledger (Batch Persist)
// @route PUT & PATCH /api/bloodbanks/inventory/save
// ============================================================================
const handleSaveInventory = async (req, res) => {
  try {
    const { stockUnits } = req.body;

    if (!stockUnits || typeof stockUnits !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid stockUnits payload' });
    }

    const bank = await findBankByIdOrEmail(req.user);
    if (!bank) {
      return res.status(404).json({ success: false, message: 'Blood bank facility not found' });
    }

    const cleanStock = {};
    BLOOD_GROUPS.forEach((g) => {
      const ascii = g.replace('−', '-');
      const unicode = g.replace('-', '−');
      cleanStock[ascii] = Math.max(0, Number(stockUnits[ascii] ?? stockUnits[unicode] ?? 0));
    });

    bank.stockUnits = cleanStock;
    bank.markModified('stockUnits');
    await bank.save();

    console.log(`[INVENTORY SAVED]: Successfully updated inventory in MongoDB for ${bank.facilityName}`);

    await safeAuditLog({
      action: 'INVENTORY_UPDATED',
      performedBy: {
        id: String(bank._id),
        name: bank.facilityName || 'Blood Bank',
        role: 'Blood Bank',
      },
      target: {
        entity: bank.facilityName,
        district: bank.district || 'Kamareddy',
      },
      details: `Full inventory ledger bulk-saved by ${bank.facilityName}.`,
      severity: 'info',
    });

    await checkInventoryThresholds(bank);

    return res.json({
      success: true,
      message: 'Inventory saved successfully to database.',
      stockUnits: bank.stockUnits,
    });
  } catch (error) {
    console.error('[Save Inventory Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.put('/inventory/save', verifyToken, handleSaveInventory);
router.patch('/inventory/save', verifyToken, handleSaveInventory);

// ============================================================================
// 7. Dispatch Blood Units to Hospital (Resilient)
// @route POST /api/bloodbanks/dispatch
// ============================================================================
router.post('/dispatch', verifyToken, async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    let bloodReq = null;
    if (mongoose.Types.ObjectId.isValid(requestId)) {
      bloodReq = await BloodRequest.findById(requestId);
    } else {
      bloodReq = await BloodRequest.findOne({ _id: requestId });
    }

    if (!bloodReq) {
      return res.status(404).json({ success: false, message: 'Emergency request not found' });
    }

    if (bloodReq.status === 'Fulfilled' || bloodReq.status === 'Dispatched') {
      return res.status(400).json({ success: false, message: 'Request is already dispatched' });
    }

    const bank = await findBankByIdOrEmail(req.user);
    if (!bank) {
      return res.status(404).json({ success: false, message: 'Authenticated blood bank profile not found' });
    }

    const cleanGroup = (bloodReq.bloodGroup || 'O+').replace('−', '-').trim();
    const unitsToDeduct = Number(bloodReq.unitsRequired || bloodReq.units || 1);

    const currentStock = bank.stockUnits || {};
    const availableUnits = Number(
      currentStock[cleanGroup] ??
      currentStock[cleanGroup.replace('-', '−')] ??
      0
    );

    if (availableUnits < unitsToDeduct) {
      return res.status(400).json({
        success: false,
        message: `Insufficient inventory: ${availableUnits} units available, ${unitsToDeduct} required.`,
      });
    }

    const updatedStock = { ...currentStock };
    updatedStock[cleanGroup] = Math.max(0, availableUnits - unitsToDeduct);
    bank.stockUnits = updatedStock;
    bank.markModified('stockUnits');
    await bank.save();

    bloodReq.status = 'Dispatched';
    await bloodReq.save();

    await safeAuditLog({
      action: 'STOCK_DISPATCHED',
      performedBy: {
        id: String(bank._id),
        name: bank.facilityName || bank.name || 'Blood Bank',
        role: 'Blood Bank',
      },
      target: {
        entity: bloodReq.hospitalName || 'Hospital Partner',
        district: bank.district || 'Kamareddy',
      },
      details: `Dispatched ${unitsToDeduct} units of ${cleanGroup} to ${bloodReq.hospitalName} (${bloodReq.ward || 'General Ward'}).`,
      severity: 'info',
    });

    try {
      await createNotification({
        recipientRole: 'hospital',
        district: bank.district,
        title: 'Units Dispatched by Blood Bank',
        body: `${bank.facilityName} has dispatched ${unitsToDeduct} units of ${cleanGroup} to your facility.`,
        type: 'success',
      });
    } catch (notifErr) {
      console.warn('[Dispatch Notification Error]:', notifErr.message);
    }

    await checkInventoryThresholds(bank);

    console.log(`[DISPATCH SUCCESS]: Deducted ${unitsToDeduct} units of ${cleanGroup} from ${bank.facilityName} to ${bloodReq.hospitalName}`);

    return res.json({
      success: true,
      message: `${unitsToDeduct} units of ${cleanGroup} dispatched successfully.`,
      updatedStock: bank.stockUnits,
      request: bloodReq,
    });
  } catch (err) {
    console.error('[Dispatch Fatal Error]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error during dispatch',
    });
  }
});

module.exports = router;