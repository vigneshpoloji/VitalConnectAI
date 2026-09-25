// backend/routes/login_routes.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Models (Standardized naming)
const Donor = require('../models/donor_model');
const Hospital = require('../models/hospital_model');
const BloodBank = require('../models/bloodBank_model');
const Admin = require('../models/admin_model');

const router = express.Router();

// ============================================================================
// 1. Unified Login Handler (Supports /login and /)
// ============================================================================
const handleLogin = async (req, res) => {
  try {
    const { email, credential, password, role } = req.body;
    const rawLoginValue = (email || credential || '').trim();

    if (!rawLoginValue || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your credential and password.',
      });
    }

    console.log(`\n--- [LOGIN ATTEMPT] ---`);
    console.log(`Identifier: "${rawLoginValue}" | Role selected: "${role || 'auto'}"`);

    const cleanInput = rawLoginValue.toLowerCase();
    const cleanPhone = rawLoginValue.replace(/\D/g, '').slice(-10);

    let user = null;
    let resolvedRole = (role || '').toLowerCase().replace(/[^a-z]/g, '');

    // 1. Targeted role query first
    if (resolvedRole === 'donor') {
      user = await Donor.findOne({
        $or: [{ email: cleanInput }, { phone: cleanPhone || cleanInput }],
      }).select('+password');
    } else if (resolvedRole === 'hospital') {
      user = await Hospital.findOne({ email: cleanInput }).select('+password');
    } else if (resolvedRole === 'bloodbank' || resolvedRole === 'bank') {
      user = await BloodBank.findOne({
        $or: [{ email: cleanInput }, { registrationNumber: rawLoginValue }],
      }).select('+password');
    } else if (resolvedRole === 'admin') {
      user = await Admin.findOne({ email: cleanInput }).select('+password');
    }

    // 2. Global fallback search across all collections if not resolved by role
    if (!user) {
      console.log(`[AUTH LOOKUP]: Searching across all collections for "${cleanInput}"...`);

      user = await BloodBank.findOne({
        $or: [{ email: cleanInput }, { registrationNumber: rawLoginValue }],
      }).select('+password');
      if (user) resolvedRole = 'bloodbank';

      if (!user) {
        user = await Hospital.findOne({ email: cleanInput }).select('+password');
        if (user) resolvedRole = 'hospital';
      }

      if (!user) {
        user = await Donor.findOne({
          $or: [{ email: cleanInput }, { phone: cleanPhone || cleanInput }],
        }).select('+password');
        if (user) resolvedRole = 'donor';
      }

      if (!user) {
        user = await Admin.findOne({ email: cleanInput }).select('+password');
        if (user) resolvedRole = 'admin';
      }
    }

    if (!user) {
      console.log(`[LOGIN REJECTED]: No record found in any collection for "${cleanInput}"`);
      return res.status(401).json({
        success: false,
        message: 'No account registered with that email or identifier.',
      });
    }

    // 3. Account suspension guard
    if (user.status && user.status.toLowerCase() === 'suspended') {
      console.log(`[LOGIN REJECTED]: Account suspended: ${cleanInput}`);
      return res.status(403).json({
        success: false,
        suspended: true,
        message: 'Account Suspended: Access has been revoked by an Administrator.',
      });
    }

    // 4. Password validation with automatic migration of legacy plaintext passwords
    let isPasswordValid = false;
    if (user.password) {
      isPasswordValid = await bcrypt.compare(password, user.password);

      // Plaintext fallback detection and automatic bcrypt hash upgrade
      if (!isPasswordValid && user.password === password) {
        console.log(`[AUTH NOTICE]: Upgrading plaintext password to bcrypt hash for ${cleanInput}`);
        user.password = await bcrypt.hash(password, 10);
        await user.save();
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      console.log(`[LOGIN REJECTED]: Password mismatch for ${cleanInput}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid password credentials.',
      });
    }

    // 5. Issue JWT and assemble normalized user payload
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: resolvedRole,
        name: user.name || user.fullName || user.hospitalName || user.facilityName,
        district: user.district || 'Kamareddy',
      },
      process.env.JWT_SECRET || 'vitalconnect_fallback_secret',
      { expiresIn: '24h' }
    );

    const userData = {
      id: user._id,
      _id: user._id,
      name: user.name || user.fullName || user.hospitalName || user.facilityName || 'User',
      email: user.email,
      role: resolvedRole,
      district: user.district || 'Kamareddy',
      bloodGroup: user.bloodGroup || undefined,
      facilityName: user.facilityName || undefined,
      hospitalName: user.hospitalName || undefined,
      status: user.status || 'Active',
    };

    console.log(`[LOGIN SUCCESS]: User ${userData.name} (${resolvedRole}) logged in.`);

    return res.json({
      success: true,
      token,
      user: userData,
    });
  } catch (error) {
    console.error('[Login Fatal Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/login', handleLogin);
router.post('/', handleLogin);

// ============================================================================
// 2. Real-Time Session Status Heartbeat
// @route GET /api/auth/verify-status & GET /api/login/verify-status
// ============================================================================
router.get('/verify-status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'vitalconnect_fallback_secret'
      );
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const cleanRole = (decoded.role || '').toLowerCase().replace(/[^a-z]/g, '');
    let account = null;

    if (cleanRole === 'donor') {
      account = await Donor.findById(decoded.id);
    } else if (cleanRole === 'hospital') {
      account = await Hospital.findById(decoded.id);
    } else if (cleanRole === 'bloodbank' || cleanRole === 'bank') {
      account = await BloodBank.findById(decoded.id);
    } else if (cleanRole === 'admin') {
      account = await Admin.findById(decoded.id);
    }

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (account.status && account.status.toLowerCase() === 'suspended') {
      return res.status(403).json({
        success: false,
        suspended: true,
        message: 'Your account has been suspended by an Administrator.',
      });
    }

    return res.json({ success: true, status: account.status || 'Active' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;