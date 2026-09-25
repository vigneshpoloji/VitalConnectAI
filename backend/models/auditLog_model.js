const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'USER_SUSPENDED',
        'USER_ACTIVATED',
        'EMERGENCY_BROADCAST',
        'STOCK_DISPATCHED',
        'INVENTORY_UPDATED',
        'CAMP_VERIFIED',
        'DONOR_FULFILLMENT',
      ],
    },
    performedBy: {
      id: {
        type: String,
        default: null,
      },
      name: {
        type: String,
        default: 'System',
      },
      role: {
        type: String,
        default: 'Admin',
      },
    },
    target: {
      entity: {
        type: String,
        required: true, // e.g. "sample blood bank", "vignesh hospital", "O+ Units"
      },
      district: {
        type: String,
        default: 'Kamareddy',
      },
    },
    details: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
  },
  {
    timestamps: true,
  }
);

// Optional indexes for efficient audit query filtering
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ 'target.district': 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);