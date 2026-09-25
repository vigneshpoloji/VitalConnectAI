const express = require('express');
const AuditLog = require('../models/auditLog_model'); // Updated to match your existing file
const verifyToken = require('../middleware/auth_middleware');

const router = express.Router();
/**
 * Internal helper to log events programmatically from other services/controllers
 * Usage: const { logAuditEvent } = require('./routes/audit_routes');
 */
const logAuditEvent = async ({ action, performedBy, target, details, severity }) => {
  try {
    await AuditLog.create({
      action,
      performedBy: {
        id: performedBy?.id || null,
        name: performedBy?.name || 'System',
        role: performedBy?.role || 'Admin',
      },
      target: {
        entity: target?.entity || 'System',
        district: target?.district || 'Kamareddy',
      },
      details,
      severity: severity || 'info',
    });
  } catch (err) {
    console.error('[Audit Logger Error]:', err.message);
  }
};

// GET /api/audit — Fetch recent audit entries with optional severity filter and aggregated stats
router.get('/', async (req, res) => {
  try {
    const { severity, limit = 50 } = req.query;
    const filter = severity ? { severity } : {};

    const [logs, total, critical, warnings] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(Math.min(Number(limit) || 50, 100)),
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ severity: 'critical' }),
      AuditLog.countDocuments({ severity: 'warning' }),
    ]);

    return res.json({
      success: true,
      stats: { total, critical, warnings },
      count: logs.length,
      logs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
      logs: [],
    });
  }
});

// POST /api/audit/log — Record manual audit entries (Admin or staff initiated)
router.post('/log', verifyToken, async (req, res) => {
  try {
    const { action, target, details, severity } = req.body;

    if (!action || !details || !target?.entity) {
      return res.status(400).json({
        success: false,
        message: 'Fields `action`, `details`, and `target.entity` are required.',
      });
    }

    const logEntry = await AuditLog.create({
      action,
      performedBy: {
        id: req.user?.id || req.user?._id || null,
        name: req.user?.name || 'Staff User',
        role: req.user?.role || 'Admin',
      },
      target: {
        entity: target.entity,
        district: target.district || 'Kamareddy',
      },
      details,
      severity: severity || 'info',
    });

    return res.status(201).json({ success: true, log: logEntry });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.logAuditEvent = logAuditEvent;