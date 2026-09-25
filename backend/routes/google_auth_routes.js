const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Donor = require('../models/donor_model');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route POST /api/auth/google/donor
router.post('/donor', async (req, res) => {
  try {
    const { credential, bloodGroup, govtIdLast4, phone, district } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Missing Google token' });
    }

    // Verify Google ID Token securely
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;
    const cleanEmail = email.toLowerCase().trim();

    // Check if donor already exists in MongoDB
    let donor = await Donor.findOne({ email: cleanEmail });

    if (!donor) {
      // Real-time signup for new donor with default district
      donor = await Donor.create({
        fullName: name,
        email: cleanEmail,
        password: `GOOGLE_AUTH_${googleId}`, // Secure placeholder for Google OAuth accounts
        bloodGroup: bloodGroup || 'O+',
        govtIdLast4: govtIdLast4 || '0000',
        phone: phone || '0000000000',
        district: district || 'Kamareddy',
      });
    }

    const token = createToken(donor._id, 'Donor');

    return res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: donor._id,
        name: donor.fullName,
        email: donor.email,
        role: 'Donor',
        bloodGroup: donor.bloodGroup,
        district: donor.district || 'Kamareddy',
      },
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(500).json({ success: false, message: 'Google verification failed' });
  }
});

module.exports = router;