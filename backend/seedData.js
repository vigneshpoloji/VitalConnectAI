require('dotenv').config();
const mongoose = require('mongoose');

const BloodBank = require('./models/bloodBank_model');
const BloodRequest = require('./models/bloodRequest_model');
const BloodCamp = require('./models/bloodCamp_model');

// Dedicated collection models
const Donor = require('./models/donor_model');
const Hospital = require('./models/hospital_model');
const Admin = require('./models/admin_model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vitalconnect';

const mockBloodBanks = [
  {
    facilityName: 'District Area Hospital Blood Centre',
    district: 'Kamareddy',
    address: 'Near Collectorate Complex, Kamareddy, Telangana 503111',
    phone: '+91 84682 22001',
    email: 'bank.kamareddy@vitalconnect.ai',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashpassword',
    registrationNumber: 'BB-TS-KMR-2024-001',
    latitude: 18.3228,
    longitude: 78.3394,
    stockUnits: {
      'A+': 14,
      'A-': 3,
      'B+': 18,
      'B-': 2,
      'AB+': 7,
      'AB-': 1,
      'O+': 22,
      'O-': 4,
    },
  },
  {
    facilityName: 'Government General Hospital Blood Bank',
    district: 'Nizamabad',
    address: 'Khaleelwadi, Nizamabad, Telangana 503001',
    phone: '+91 84622 34500',
    email: 'bank.nizamabad@vitalconnect.ai',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashpassword',
    registrationNumber: 'BB-TS-NZB-2024-002',
    latitude: 18.6725,
    longitude: 78.0941,
    stockUnits: {
      'A+': 8,
      'A-': 1,
      'B+': 12,
      'B-': 0,
      'AB+': 4,
      'AB-': 0,
      'O+': 16,
      'O-': 2,
    },
  },
  {
    facilityName: 'Red Cross Society Regional Blood Centre',
    district: 'Hyderabad',
    address: 'Vidyanagar, Main Road, Hyderabad, Telangana 500044',
    phone: '+91 40276 33311',
    email: 'bank.hyderabad@vitalconnect.ai',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashpassword',
    registrationNumber: 'BB-TS-HYD-2024-003',
    latitude: 17.4018,
    longitude: 78.5085,
    stockUnits: {
      'A+': 28,
      'A-': 8,
      'B+': 32,
      'B-': 6,
      'AB+': 15,
      'AB-': 5,
      'O+': 45,
      'O-': 11,
    },
  },
];

const mockDonors = [
  {
    name: 'Vignesh Bunny',
    fullName: 'Vignesh Bunny',
    email: 'vignesh.donor@vitalconnect.ai',
    phone: '+91 98765 43210',
    district: 'Kamareddy',
    bloodGroup: 'O+',
    isAvailable: true,
    totalDonationsCount: 3,
    lastDonatedDate: new Date(Date.now() - 105 * 24 * 60 * 60 * 1000), // > 90 days (eligible)
  },
  {
    name: 'Rahul Varma',
    fullName: 'Rahul Varma',
    email: 'rahul.donor@vitalconnect.ai',
    phone: '+91 91234 56789',
    district: 'Kamareddy',
    bloodGroup: 'O-',
    isAvailable: false,
    totalDonationsCount: 1,
    lastDonatedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // < 90 days (cooldown active)
  },
];

const mockHospitals = [
  {
    name: 'Dr. Suresh Rao',
    hospitalName: 'Kamareddy Emergency Trauma Care',
    email: 'hospital.kamareddy@vitalconnect.ai',
    phone: '+91 98480 12345',
    district: 'Kamareddy',
    status: 'Active',
  },
];

const mockAdmins = [
  {
    name: 'System SuperAdmin',
    email: 'admin@vitalconnect.ai',
    phone: '+91 99999 00000',
    role: 'admin',
    status: 'Active',
  },
];

const mockRequests = [
  {
    hospitalName: 'Kamareddy Emergency Trauma Care',
    bloodGroup: 'O-',
    component: 'Packed RBC',
    unitsRequired: 2,
    units: 2,
    urgencyLevel: 'Critical Trauma',
    ward: 'Trauma ICU Bay 1',
    patientCondition: 'Highway accident polytrauma requiring immediate surgical stabilization',
    district: 'Kamareddy',
    status: 'Pending Verification',
    createdAt: new Date(),
  },
  {
    hospitalName: 'Maternity & Child Health Centre',
    bloodGroup: 'B+',
    component: 'Packed RBC',
    unitsRequired: 1,
    units: 1,
    urgencyLevel: 'Urgent',
    ward: 'Post-Op Recovery',
    patientCondition: 'Emergency C-section postpartum hemorrhage mitigation',
    district: 'Kamareddy',
    status: 'In Transit',
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
  },
];

const mockCamps = [
  {
    campName: 'Youth Red Cross Mega Blood Donation Drive',
    organizer: 'Indian Red Cross Society',
    venue: 'Community Hall, Near Bus Station, Kamareddy',
    district: 'Kamareddy',
    preferredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    expectedDonors: 120,
    attendees: [],
    status: 'Medically Verified',
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[Seeder] Connected to MongoDB.');

    // 1. Clear previous operational records
    await BloodBank.deleteMany({});
    await BloodRequest.deleteMany({});
    await BloodCamp.deleteMany({});
    await Donor.deleteMany({});
    await Hospital.deleteMany({});
    await Admin.deleteMany({});

    console.log('[Seeder] Cleared previous collection records.');

    // 2. Insert Core Operational Data
    await BloodBank.insertMany(mockBloodBanks);
    console.log(`[Seeder] Seeded ${mockBloodBanks.length} blood banks with access credentials.`);

    await BloodRequest.insertMany(mockRequests);
    console.log(`[Seeder] Seeded ${mockRequests.length} emergency requests.`);

    await BloodCamp.insertMany(mockCamps);
    console.log(`[Seeder] Seeded ${mockCamps.length} blood donation camps.`);

    // 3. Upsert Role Accounts
    for (const d of mockDonors) {
      await Donor.findOneAndUpdate({ email: d.email }, d, { upsert: true, new: true });
    }
    console.log(`[Seeder] Seeded ${mockDonors.length} donors.`);

    for (const h of mockHospitals) {
      await Hospital.findOneAndUpdate({ email: h.email }, h, { upsert: true, new: true });
    }
    console.log(`[Seeder] Seeded ${mockHospitals.length} hospitals.`);

    for (const a of mockAdmins) {
      await Admin.findOneAndUpdate({ email: a.email }, a, { upsert: true, new: true });
    }
    console.log(`[Seeder] Seeded ${mockAdmins.length} administrator account(s).`);

    console.log('\n======================================================');
    console.log('✅ VitalConnectAI Database Seed Completed Successfully!');
    console.log('======================================================');
    process.exit(0);
  } catch (err) {
    console.error('[Seeder Failed]:', err);
    process.exit(1);
  }
}

seed();