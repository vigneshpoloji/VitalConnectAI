require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/admin_model');

async function fixAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    const email = 'vigneshpoloji@gmail.com';
    const plainPassword = '123456789';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Upsert admin with all permission flags active
    const admin = await Admin.findOneAndUpdate(
      { email },
      {
        $set: {
          adminName: 'Super Administrator',
          email,
          password: hashedPassword,
          adminMfaCode: '123456',
          role: 'Admin',
          accessTier: 'SuperAdmin',
          isAuthorizedBySuperAdmin: true, // Must be true to avoid 403
        },
      },
      { upsert: true, new: true }
    );

    console.log('\n========================================');
    console.log('✅ ADMIN FIXED AND FULLY AUTHORIZED:');
    console.log('========================================');
    console.log(`Email    : ${admin.email}`);
    console.log(`Password : ${plainPassword}`);
    console.log(`Role     : ${admin.role}`);
    console.log(`MFA Code : ${admin.adminMfaCode}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error fixing admin:', err);
    process.exit(1);
  }
}

fixAdmin();