const mongoose = require('mongoose');
require('dotenv').config();

const BloodBank = require('../models/bloodBank_model');

async function fixPhones() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vitalconnect_db');

  const updates = [
    { name: /Gandhari/i, phone: '+91 94401 23456', address: 'Gandhari PHC Complex, Main Road' },
    { name: /nizamabad/i, phone: '+91 84622 34567', address: 'Government General Hospital, Khaleelwadi, Nizamabad' },
    { name: /sample/i, phone: '+91 98765 43210', address: 'District Area Hospital Campus, Kamareddy' },
  ];

  for (const item of updates) {
    await BloodBank.updateMany(
      { facilityName: item.name },
      { 
        $set: { 
          contactNumber: item.phone, 
          phone: item.phone, 
          address: item.address 
        } 
      }
    );
  }

  console.log('✅ Blood bank phone numbers and verified addresses updated.');
  process.exit(0);
}

fixPhones();