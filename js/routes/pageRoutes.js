/**
 * ============================================
 * PAGE ROUTES
 * ============================================
 * HTML page serving routes
 */

const express = require('express');
const router = express.Router();
const { pages, auth } = require('../controllers');
const { protectPageRoute } = require('../middleware');

/**
 * @route   GET /
 * @desc    Home page
 * @access  Public
 */
router.get('/', pages.home);

/**
 * @route   GET /login, /signup, /auth
 * @desc    Auth page (unified login/signup)
 * @access  Public
 */
router.get(['/login', '/signup', '/auth'], pages.auth);

/**
 * @route   GET /models
 * @desc    Trained models showcase page
 * @access  Public
 */
router.get(['/models', '/models.html'], pages.models);

/**
 * @route   GET /verify
 * @desc    Verification page
 * @access  Private
 */
router.get(['/verify', '/verify.html'], protectPageRoute, pages.verify);

/**
 * @route   GET /profile
 * @desc    User profile page
 * @access  Private
 */
router.get(['/profile', '/profile.html'], protectPageRoute, pages.profile);

/**
 * @route   GET /history
 * @desc    Verification history page
 * @access  Private
 */
router.get(['/history', '/history.html'], protectPageRoute, pages.history);

/**
 * @route   GET /logout
 * @desc    Logout and redirect
 * @access  Public
 */
router.get('/logout', auth.logout);

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', pages.healthCheck);

module.exports = router;
