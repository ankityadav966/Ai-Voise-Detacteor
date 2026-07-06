const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { sendOtpEmail } = require('../services/emailService');

// Helper to generate access token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

// Helper to generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * User Registration / Signup
 */
exports.signup = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This email address is already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    res.status(201).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User Login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Update refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, profilePicture: user.profilePicture },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Token Rotation
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked refresh token.' });
    }

    // Generate new pair
    const nextAccess = generateAccessToken(user.id);
    const nextRefresh = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: nextRefresh }
    });

    res.status(200).json({
      success: true,
      tokens: { accessToken: nextAccess, refreshToken: nextRefresh },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password - Send OTP
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user registered with this email address.' });
    }

    // Generate 4-digit code
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiration

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpires },
    });

    try {
      await sendOtpEmail(normalizedEmail, otpCode);
    } catch (e) {
      console.warn('[SMTP] Failed to send email:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your email.',
      otp: otpCode,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP code
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.otpCode || user.otpCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid or incorrect verification code.' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, message: 'Verification code has expired.' });
    }

    res.status(200).json({ success: true, message: 'Verification successful.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password using verified OTP
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.otpCode || user.otpCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid or missing verification code.' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, message: 'Verification code expired.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otpCode: null,
        otpExpires: null,
      },
    });

    res.status(200).json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, profilePicture: true, createdAt: true }
    });
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, profilePicture } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, profilePicture },
      select: { id: true, email: true, name: true, profilePicture: true }
    });

    res.status(200).json({ success: true, user: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Change Password (when logged in)
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout
 */
exports.logout = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null }
    });
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete User Account
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.user.id } });
    res.status(200).json({ success: true, message: 'Account deleted permanently.' });
  } catch (error) {
    next(error);
  }
};
