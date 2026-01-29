/**
 * ============================================
 * USER ROUTES
 * ============================================
 * /api/user/* endpoints
 */

const express = require('express');
const router = express.Router();
const { user } = require('../controllers');
const { 
    isLoggedIn, 
    validateProfileUpdate,
    upload,
    handleUploadError
} = require('../middleware');

// All user routes require authentication
router.use(isLoggedIn);

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', user.getProfile);

/**
 * @route   POST /api/user/profile
 * @desc    Update user profile (with optional image upload)
 * @access  Private
 */
router.post(
    '/profile', 
    upload.single('profileImage'),
    handleUploadError,
    validateProfileUpdate, 
    user.updateProfile
);

/**
 * @route   DELETE /api/user/profile
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/profile', user.deleteAccount);

/**
 * @route   POST /api/user/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', user.changePassword);

// Legacy route aliases
router.get('/', user.getProfile); // GET /api/user

module.exports = router;
