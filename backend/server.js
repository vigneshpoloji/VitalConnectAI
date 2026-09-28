const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const connectDatabase = require('./config/database_connection');

// Account Models for Verification Heartbeat
const Donor = require('./models/donor_model');
const Hospital = require('./models/hospital_model');
const BloodBank = require('./models/bloodBank_model');
const Admin = require('./models/admin_model');

dotenv.config();

// Connect to MongoDB instance
connectDatabase();

const app = express();

// ============================================================================
// 1. Create Native HTTP Server Wrapping Express
// ============================================================================
const server = http.createServer(app);

// ============================================================================
// 2. Security Headers & Payload Compression
// ============================================================================
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(compression());

// ============================================================================
// 3. Permissive Origin Validator & Dynamic Vercel Matching
// ============================================================================
const allowedOrigins = [
  'https://vital-connect-ai.vercel.app',
  'https://vitalconnect-ai.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  process.env.FRONTEND_PROD_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') // Dynamically accepts all Vercel branch/preview deployments
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================================
// 4. Deployment Health Checks (Bypasses Rate Limiter for Monitors)
// ============================================================================
const handleHealthCheck = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
};

app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);

// Root operational health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'VitalConnectAI Backend API is operational',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// 5. Rate Limiters (Relaxed for Local Dev & High Traffic)
// ============================================================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Raised to accommodate multi-tab polling and live queues
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return (
      process.env.NODE_ENV !== 'production' ||
      req.ip === '127.0.0.1' ||
      req.ip === '::1' ||
      req.ip === '::ffff:127.0.0.1' ||
      req.hostname === 'localhost'
    );
  },
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

app.use('/api', generalLimiter);

const emergencyActionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30, // Increased threshold for dispatch events
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return (
      process.env.NODE_ENV !== 'production' ||
      req.ip === '127.0.0.1' ||
      req.ip === '::1' ||
      req.ip === '::ffff:127.0.0.1' ||
      req.hostname === 'localhost'
    );
  },
  message: {
    success: false,
    message:
      'Emergency dispatch limit reached for this session. Please contact the district coordinator directly.',
  },
});

app.use('/api/blood-requests/create', emergencyActionLimiter);
app.use('/api/requests/create', emergencyActionLimiter);
app.use('/api/triage', emergencyActionLimiter);

// ============================================================================
// 6. Direct Universal Session Heartbeat (Non-Throwing Handler)
// ============================================================================
const handleVerifyStatus = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(200).json({
        success: true,
        authenticated: false,
        user: null,
        status: 'guest',
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'vitalconnect_fallback_secret'
      );
    } catch {
      return res.status(200).json({
        success: true,
        authenticated: false,
        user: null,
        message: 'Token expired or invalid',
      });
    }

    const userId = decoded.id || decoded._id;
    const role = (decoded.role || '').toLowerCase().replace(/[^a-z]/g, '');
    let account = null;

    if (role === 'donor') account = await Donor.findById(userId).select('-password');
    else if (role === 'hospital') account = await Hospital.findById(userId).select('-password');
    else if (role.includes('bank')) account = await BloodBank.findById(userId).select('-password');
    else if (role === 'admin') account = await Admin.findById(userId).select('-password');

    if (!account) {
      try {
        const User = require('./models/user_model');
        account = await User.findById(userId).select('-password');
      } catch (_) {}
    }

    if (!account) {
      return res.status(200).json({
        success: true,
        authenticated: false,
        user: null,
      });
    }

    if (account.status && account.status.toLowerCase() === 'suspended') {
      return res.status(403).json({
        success: false,
        suspended: true,
        message: 'Your account has been suspended by an Administrator.',
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: account,
      status: account.status || 'Active',
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      authenticated: false,
      user: null,
      message: err.message,
    });
  }
};

app.get('/api/auth/verify-status', handleVerifyStatus);
app.get('/api/login/verify-status', handleVerifyStatus);

// ============================================================================
// 7. Current Blood Bank Facility Profile Endpoint
// ============================================================================
app.get('/api/bloodbanks/me', async (req, res) => {
  try {
    let bank = null;
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'vitalconnect_fallback_secret'
        );
        const bankId = decoded.id || decoded._id || decoded.bloodBankId;
        if (bankId) {
          bank = await BloodBank.findById(bankId).select('-password');
        }
      } catch (_) {}
    }

    if (!bank) {
      bank = await BloodBank.findOne().select('-password');
    }

    if (!bank) {
      return res.status(200).json({
        success: true,
        bank: {
          facilityName: 'District Area Hospital Blood Centre',
          district: 'Kamareddy',
          address: 'Near Collectorate Complex, Kamareddy',
          phone: '+91 84682 22001',
          stockUnits: { 'A+': 10, 'B+': 12, 'O+': 15, 'O-': 4, 'AB+': 5 },
        },
      });
    }

    return res.status(200).json({
      success: true,
      bank,
      stockUnits: bank.stockUnits,
      data: bank,
    });
  } catch (err) {
    console.error('Error fetching bloodbank profile:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 8. Attach Socket.io to the HTTP Server Instance with Shared CORS Rules
// ============================================================================
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Socket CORS error'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('join_district', (district) => {
    if (district) {
      const room = district.trim().toLowerCase();
      socket.join(room);
      console.log(`[Socket] ${socket.id} joined district room: ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// ============================================================================
// 9. Mount Feature Routes
// ============================================================================
const loginRoutes = require('./routes/login_routes');
const bloodRequestRoutes = require('./routes/bloodRequest_routes');
const donorRoutes = require('./routes/donor_routes');
const bloodBankRoutes = require('./routes/bloodBank_routes');
const campRoutes = require('./routes/camp_routes');
const { router: pushRouter } = require('./routes/push_routes');
const aiTriageRoutes = require('./routes/aiTriage_routes');

app.use('/api/push', pushRouter);
app.use('/api/notifications', require('./routes/notification_routes'));
app.use('/api/triage', aiTriageRoutes);

app.use('/api/auth', loginRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/auth/signup', require('./routes/signup_routes'));
app.use('/api/auth/google', require('./routes/google_auth_routes'));
app.use('/api/ai', require('./routes/ai_routes'));

app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/requests', bloodRequestRoutes);
app.use('/api/audit', require('./routes/audit_routes'));
app.use('/api/donors', donorRoutes);
app.use('/api/bloodbanks', bloodBankRoutes);
app.use('/api/bloodbank', bloodBankRoutes);
app.use('/api/camps', campRoutes);
app.use('/api/admin/camps', campRoutes);
app.use('/api/blood', require('./routes/blood_routes'));
app.use('/api/admin', require('./routes/admin_routes'));

// ============================================================================
// 10. Start Server via server.listen
// ============================================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`VitalConnectAI Server & WebSockets running on http://localhost:${PORT}`);
});