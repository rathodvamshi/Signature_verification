/**
 * ============================================
 * AUTH ROUTES
 * ============================================
 * /api/auth/* endpoints
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../controllers');
const { 
    validateRegistration, 
    validateLogin, 
    authLimiter,
    statusLimiter,
    isLoggedIn
} = require('../middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, validateRegistration, auth.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, validateLogin, auth.login);

/**
 * @route   GET /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.get('/logout', auth.logout);

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', statusLimiter, auth.getStatus);

/**
 * @route   POST /api/auth/invalidate-sessions
 * @desc    Invalidate all user sessions (global logout)
 * @access  Private
 */
router.post('/invalidate-sessions', isLoggedIn, auth.invalidateAllSessions);

// Legacy route aliases
router.post('/', authLimiter, validateLogin, auth.login); // POST /api/auth

module.exports = router;
