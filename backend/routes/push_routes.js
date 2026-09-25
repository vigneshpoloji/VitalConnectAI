const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const PushSubscription = require('../models/pushSubscription_model');
const Donor = require('../models/donor_model');

// Configure WebPush with environment VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_MAILTO || 'mailto:vigneshpoloji@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const {
      subscription,
      userId,
      role = 'donor',
      district = 'Kamareddy',
      bloodGroup = 'O+',
    } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid push subscription.' });
    }

    // Upsert subscription
   // Replace { upsert: true, new: true } with:
    await PushSubscription.findOneAndUpdate(
      { 'subscription.endpoint': subscription.endpoint },
      {
        userId: userId || null,
        role: role.toLowerCase(),
        district,
        bloodGroup,
        subscription,
      },
      { upsert: true, returnDocument: 'after' }
    );

    return res.json({ success: true, message: 'Push notifications registered.' });
  } catch (err) {
    console.error('[Push Subscribe Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: Dispatch broadcast strictly to matching, eligible donors outside cooldown
async function broadcastEmergencyWebPush({ hospitalName, district, bloodGroup, unitsRequired }) {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // 1. Fetch donors matching region & group who are NOT in recovery
    const donorQuery = {
      district: new RegExp(`^${district}$`, 'i'),
      bloodGroup: { $in: [bloodGroup, 'O-'] },$or: [
        { lastDonatedDate: null },
        { lastDonatedDate: { $lte: ninetyDaysAgo } },
      ],
    };

    let eligibleDonors = await Donor.find(donorQuery).select('_id');

    // Fallback if user records are stored in User model
    if (!eligibleDonors.length) {
      try {
        const User = require('../models/user_model');
        eligibleDonors = await User.find({
          ...donorQuery,
          role: 'donor',
        }).select('_id');
      } catch (_) {}
    }

    const eligibleDonorIds = eligibleDonors.map((d) => d._id);

    // 2. Fetch push subscriptions:
    // Match subscriptions tied to eligible donor IDs OR subscriptions without a linked userId
    const subscribers = await PushSubscription.find({
      district: new RegExp(`^${district}$`, 'i'),
      bloodGroup: { $in: [bloodGroup, 'O-'] },$or: [
        { userId: { $in: eligibleDonorIds } },
        { userId: null },
      ],
    });

    console.log(
      `[WebPush] Dispatching alerts to ${subscribers.length} eligible subscriber(s) for ${bloodGroup} in ${district}...`
    );

    const payload = JSON.stringify({
      title: `🚨 EMERGENCY: ${bloodGroup} Blood Needed`,
      body: `${hospitalName} in ${district} needs ${unitsRequired} unit(s) of ${bloodGroup} immediately. Tap to respond.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      url: '/donor',
    });

    const notifications = subscribers.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
      } catch (err) {
        // Prune expired or revoked endpoints
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    });

    await Promise.allSettled(notifications);
  } catch (err) {
    console.error('[WebPush Broadcast Error]:', err);
  }
}

module.exports = { router, broadcastEmergencyWebPush };