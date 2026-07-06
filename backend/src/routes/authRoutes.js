const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  refreshToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  deleteAccount,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public auth endpoints
router.post('/signup', authLimiter, signup);
router.post('/register', authLimiter, signup); // Added to match frontend
router.post('/login', authLimiter, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Protected user routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.patch('/profile', protect, updateProfile); // Added to match frontend
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);
router.delete('/delete-account', protect, deleteAccount);
router.delete('/profile', protect, deleteAccount); // Added to match frontend

module.exports = router;
