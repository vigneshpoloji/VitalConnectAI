const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      required: true,
      enum: ['donor', 'hospital', 'bloodbank', 'admin'],
    },
    recipientId: {
      type: String, // Specific user ID or 'all' for broad broadcasts
      default: 'all',
    },
    district: {
      type: String,
      default: 'Kamareddy',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['critical', 'warning', 'info', 'success'],
      default: 'info',
    },
    unread: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);