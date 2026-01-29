/**
 * ============================================
 * MIDDLEWARE INDEX
 * ============================================
 * Export all middleware from single point
 */

const auth = require('./auth');
const validation = require('./validation');
const upload = require('./upload');
const rateLimiter = require('./rateLimiter');

module.exports = {
    // Auth middleware
    isLoggedIn: auth.isLoggedIn,
    protectPageRoute: auth.protectPageRoute,
    optionalAuth: auth.optionalAuth,
    generateToken: auth.generateToken,
    setAuthCookie: auth.setAuthCookie,
    
    // Validation middleware
    validateRegistration: validation.validateRegistration,
    validateLogin: validation.validateLogin,
    validateProfileUpdate: validation.validateProfileUpdate,
    validateVerification: validation.validateVerification,
    validateObjectId: validation.validateObjectId,
    validatePagination: validation.validatePagination,
    isValidEmail: validation.isValidEmail,
    sanitizeString: validation.sanitizeString,
    
    // Upload middleware
    upload: upload.upload,
    handleUploadError: upload.handleUploadError,
    deleteFile: upload.deleteFile,
    moveToHistory: upload.moveToHistory,
    
    // Rate limiters
    authLimiter: rateLimiter.authLimiter,
    apiLimiter: rateLimiter.apiLimiter,
    statusLimiter: rateLimiter.statusLimiter,
    verificationLimiter: rateLimiter.verificationLimiter
};
