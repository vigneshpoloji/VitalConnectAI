// backend/utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'vitalconnectai@gmail.com',
    pass: process.env.EMAIL_PASS || 'your_app_password_here',
  },
});

const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const mailOptions = {
    from: `"VitalConnectAI Governance" <${process.env.EMAIL_USER || 'no-reply@vitalconnect.ai'}>`,
    to: toEmail,
    subject: 'VitalConnectAI — Password Reset Link',
    html: `
      <div style="font-family: Arial, sans-serif; background: #fdfafb; padding: 30px; color: #1c1417;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e9dce0;">
          <h2 style="color: #bd1230; margin-top: 0;">VitalConnectAI Access Recovery</h2>
          <p>You requested a password reset for your account. Click the button below to choose a new password. This link is valid for 15 minutes.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background: #bd1230; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #766a6f;">If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `,
  };

  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL SENT]: Password reset email dispatched to ${toEmail}`);
    } else {
      console.log(`\n======================================================`);
      console.log(`[SMTP SIMULATION] Password Reset URL for ${toEmail}:`);
      console.log(resetUrl);
      console.log(`======================================================\n`);
    }
  } catch (err) {
    console.error('[Email Send Error]:', err.message);
    console.log(`Fallback reset link: ${resetUrl}`);
  }
};

module.exports = { sendPasswordResetEmail };