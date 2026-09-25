const jwt = require('jsonwebtoken');

const Donor = require('../models/donor_model');
const Hospital = require('../models/hospital_model');
const BloodBank = require('../models/bloodBank_model');
const Admin = require('../models/admin_model');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'vitalconnect_fallback_secret'
    );

    req.user = decoded;

    // Live status validation directly against MongoDB
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

    if (account && account.status && account.status.toLowerCase() === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an Administrator.',
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token',
    });
  }
};

module.exports = verifyToken;