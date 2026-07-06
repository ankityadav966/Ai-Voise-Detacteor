const nodemailer = require('nodemailer');

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

/**
 * Send an OTP Email to the user
 */
exports.sendOtpEmail = async (email, otpCode) => {
  console.log(`[EmailOTP] Generated code ${otpCode} for ${email}`);

  // If credentials are not set, skip sending email and just log it (useful for sandbox/dev testing)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[EmailOTP] SMTP Credentials not configured. Code logged in console.');
    return;
  }

  const mailOptions = {
    from: `"Patera Lekha AI" <${process.env.FROM_EMAIL || 'noreply@peterlaka.ai'}>`,
    to: email,
    subject: 'Patera Lekha Password Reset Verification Code',
    text: `Your password reset verification code is: ${otpCode}. It is valid for 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #6366f1; text-align: center;">Patera Lekha Security Verification</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Use the verification code below to proceed:</p>
        <div style="background-color: #f3f4f6; font-size: 28px; font-weight: bold; text-align: center; letter-spacing: 5px; padding: 15px; margin: 20px 0; border-radius: 6px; color: #1e1b4b;">
          ${otpCode}
        </div>
        <p>This verification code is valid for <strong>10 minutes</strong>. If you did not make this request, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">Patera Lekha Inc. • Intelligent meeting assistant</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailOTP] Email sent successfully to ${email}`);
  } catch (error) {
    console.error(`[EmailOTP] Transporter error sending email: ${error.message}`);
  }
};
