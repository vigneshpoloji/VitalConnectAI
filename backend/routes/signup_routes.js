const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Donor = require('../models/donor_model');
const Hospital = require('../models/hospital_model');
const BloodBank = require('../models/bloodBank_model');
const Admin = require('../models/admin_model');

const router = express.Router();

const createToken = (id, role, email, district) => {
  return jwt.sign(
    {
      id,
      role,
      email,
      district: district || 'Kamareddy',
    },
    process.env.JWT_SECRET || 'vitalconnect_fallback_secret',
    { expiresIn: '7d' }
  );
};

// Initial empty blood units object with standard keys
const defaultStockUnits = {
  'O+': 0,
  'O-': 0,
  'A+': 0,
  'A-': 0,
  'B+': 0,
  'B-': 0,
  'AB+': 0,
  'AB-': 0,
};

// @route POST /api/auth/signup
const handleSignup = async (req, res) => {
  try {
    const {
      role,
      email,
      password,
      name,
      bloodGroup,
      govtIdLast4,
      phone,
      cmoPin,
      address,
      district,
      licenseNumber,
      registrationNumber,
    } = req.body;

    if (!role || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Role, email, and password are required',
      });
    }

    // Sanitize email and normalize role string
    const cleanEmail = email.trim().toLowerCase();
    const cleanDistrict = (district || 'Kamareddy').trim();
    const normalizedRole = role.trim().toLowerCase().replace(/[^a-z]/g, '');

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let createdUser;
    let assignedRole = role;

    switch (normalizedRole) {
      case 'donor': {
        assignedRole = 'Donor';
        const exists = await Donor.findOne({ email: new RegExp(`^${cleanEmail}$`, 'i') });
        if (exists) {
          return res.status(409).json({ success: false, message: 'Donor email already registered' });
        }

        createdUser = await Donor.create({
          role: 'Donor',
          fullName: name ? name.trim() : 'Anonymous Donor',
          email: cleanEmail,
          password: hashedPassword,
          bloodGroup: bloodGroup || 'O+',
          govtIdLast4: govtIdLast4 ? govtIdLast4.trim() : '0000',
          phone: phone ? phone.trim() : '0000000000',
          district: cleanDistrict,
        });
        break;
      }

      case 'hospital': {
        assignedRole = 'Hospital';
        const exists = await Hospital.findOne({ email: new RegExp(`^${cleanEmail}$`, 'i') });
        if (exists) {
          return res.status(409).json({ success: false, message: 'Hospital email already registered' });
        }

        createdUser = await Hospital.create({
          role: 'Hospital',
          hospitalName: name ? name.trim() : 'Hospital Facility',
          email: cleanEmail,
          password: hashedPassword,
          licenseNumber: (licenseNumber || `HOSP-${Date.now()}`).trim(),
          cmoPin: (cmoPin || '123456').trim(),
          phone: phone ? phone.trim() : '0000000000',
          address: address ? address.trim() : 'Main Road',
          district: cleanDistrict,
        });
        break;
      }

      case 'bloodbank':
      case 'bank': {
        assignedRole = 'Blood Bank';
        const exists = await BloodBank.findOne({ email: new RegExp(`^${cleanEmail}$`, 'i') });
        if (exists) {
          return res.status(409).json({ success: false, message: 'Blood Bank email already registered' });
        }

        const regNum = (registrationNumber || licenseNumber || `BB-${Date.now()}`).trim();

        createdUser = await BloodBank.create({
          role: 'Blood Bank',
          facilityName: name ? name.trim() : 'Blood Center',
          email: cleanEmail,
          password: hashedPassword,
          registrationNumber: regNum,
          phone: phone ? phone.trim() : '0000000000',
          address: address ? address.trim() : 'District Center',
          district: cleanDistrict,
          stockUnits: defaultStockUnits,
        });
        break;
      }

      case 'admin': {
        return res.status(403).json({
          success: false,
          message: 'Admin account creation is restricted. Contact SuperAdmin for manual provisioning.',
        });
      }

      default:
        return res.status(400).json({ success: false, message: `Invalid role: ${role}` });
    }

    const token = createToken(createdUser._id, assignedRole, createdUser.email, cleanDistrict);

    return res.status(201).json({
      success: true,
      message: `${assignedRole} account created successfully`,
      token,
      user: {
        id: createdUser._id,
        _id: createdUser._id,
        name:
          createdUser.fullName ||
          createdUser.hospitalName ||
          createdUser.facilityName ||
          name,
        email: createdUser.email,
        role: createdUser.role || assignedRole,
        district: cleanDistrict,
        bloodGroup: createdUser.bloodGroup || null,
      },
    });
  } catch (err) {
    console.error('[Signup Route Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Listen on both '/' and '/signup'
router.post('/', handleSignup);
router.post('/signup', handleSignup);

module.exports = router;