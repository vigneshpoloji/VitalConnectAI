// backend/routes/notification_routes.js

const express = require('express');
const Notification = require('../models/notification_model');

const router = express.Router();

/**
 * Internal helper to trigger in-app notifications from other routes/services
 * (e.g. bloodBank dispatches, emergency requests, low stock alerts)
 */
const createNotification = async ({
  recipientRole,
  recipientId = 'all',
  district = 'Kamareddy',
  title,
  body,
  type = 'info',
}) => {
  try {
    const cleanRole = recipientRole
      ? recipientRole.toLowerCase().replace(/[^a-z]/g, '')
      : 'all';

    await Notification.create({
      recipientRole: cleanRole,
      recipientId,
      district,
      title,
      body,
      type,
      unread: true,
      isRead: false,
    });
  } catch (err) {
    console.error('[Notification Trigger Error]:', err.message);
  }
};

// ============================================================================
// 1. GET /api/notifications
// Supports query params: role, district, userId
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { role, district, userId } = req.query;
    const filter = {};

    // Match role or general broadcast ('all')
    if (role) {
      const normalizedRole = role.toLowerCase().replace(/[^a-z]/g, '');
      filter.recipientRole = { $in: [normalizedRole, 'all'] };
    }

    // Match district (case-insensitive) or global alerts ('all')
    if (district && district.trim()) {
      const escapedDistrict = district.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { district: new RegExp(`^${escapedDistrict}$`, 'i') },
        { district: new RegExp('^all$', 'i') },
      ];
    }

    // Match specific user or broadcast to all users
    if (userId) {
      const userCondition = [{ recipientId: userId }, { recipientId: 'all' }];
      if (filter.$or) {
        filter.$and = [{$or: filter.$or }, {$or: userCondition }];
        delete filter.$or;
      } else {
        filter.$or = userCondition;
      }
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(30);

    // Calculate unread count supporting either unread or isRead schema conventions
    const unreadCount = notifications.filter(
      (n) => n.unread === true || n.isRead === false
    ).length;

    return res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (err) {
    console.error('[Notification Fetch Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
      notifications: [],
      unreadCount: 0,
    });
  }
});

// ============================================================================
// 2. PATCH /api/notifications/mark-read
// Updates unread and isRead fields for role, district, or userId
// ============================================================================
router.patch('/mark-read', async (req, res) => {
  try {
    const { role, district, userId } = req.body;
    const filter = {};

    if (role) {
      const normalizedRole = role.toLowerCase().replace(/[^a-z]/g, '');
      filter.recipientRole = { $in: [normalizedRole, 'all'] };
    }

    if (district) {
      const escapedDistrict = district.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.district = { $in: [new RegExp(`^${escapedDistrict}$`, 'i'), 'all', 'All'] };
    }

    if (userId) {
      filter.recipientId = { $in: [userId, 'all'] };
    }

    // Mark both flag styles as read
    await Notification.updateMany(filter, {
      $set: {
        unread: false,
        isRead: true,
      },
    });

    return res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    console.error('[Notification Mark-Read Error]:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.createNotification = createNotification;