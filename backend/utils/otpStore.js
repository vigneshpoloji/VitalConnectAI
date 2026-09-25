// backend/utils/otpStore.js

// Map stores: key (email or mobile) -> { otp, expiresAt, role }
const otpCache = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOTP = (key, otp, role = null, ttlMinutes = 10) => {
  const cleanKey = key.trim().toLowerCase();
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  otpCache.set(cleanKey, { otp, expiresAt, role });
};

const verifyAndConsumeOTP = (key, enteredOtp) => {
  const cleanKey = key.trim().toLowerCase();
  const record = otpCache.get(cleanKey);

  if (!record) {
    return { valid: false, message: 'OTP not requested or has expired.' };
  }

  if (Date.now() > record.expiresAt) {
    otpCache.delete(cleanKey);
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (record.otp !== enteredOtp.trim()) {
    return { valid: false, message: 'Invalid OTP entered. Please try again.' };
  }

  // Consume OTP once verified
  const role = record.role;
  otpCache.delete(cleanKey);
  return { valid: true, role };
};

module.exports = {
  generateOTP,
  saveOTP,
  verifyAndConsumeOTP,
};