/**
 * ============================================
 * VERIFICATION ROUTES
 * ============================================
 * /api/verify/* endpoints
 */

const express = require('express');
const router = express.Router();
const { verification } = require('../controllers');
const { 
    isLoggedIn,
    validateVerification,
    validatePagination,
    validateObjectId,
    upload,
    handleUploadError,
    verificationLimiter
} = require('../middleware');

/**
 * @route   POST /api/verify/predict
 * @desc    Verify a signature image
 * @access  Private
 */
router.post(
    '/predict',
    isLoggedIn,
    verificationLimiter,
    upload.single('file'),
    handleUploadError,
    validateVerification,
    verification.verifySignature
);

/**
 * @route   GET /api/verify/history
 * @desc    Get verification history
 * @access  Private
 */
router.get('/history', isLoggedIn, validatePagination, verification.getHistory);

/**
 * @route   DELETE /api/verify/history/:id
 * @desc    Delete a history item
 * @access  Private
 */
router.delete(
    '/history/:id', 
    isLoggedIn, 
    validateObjectId('id'), 
    verification.deleteHistoryItem
);

/**
 * @route   POST /api/verify/history/bulk-delete
 * @desc    Delete multiple history items
 * @access  Private
 */
router.post('/history/bulk-delete', isLoggedIn, verification.bulkDeleteHistory);

/**
 * @route   DELETE /api/verify/history
 * @desc    Clear all verification history
 * @access  Private
 */
router.delete('/history', isLoggedIn, verification.clearHistory);

/**
 * @route   GET /api/verify/models
 * @desc    Get available trained models
 * @access  Public
 */
router.get('/models', verification.getAvailableModels);

module.exports = router;
