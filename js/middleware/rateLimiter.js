/**
 * ============================================
 * RATE LIMITER MIDDLEWARE
 * ============================================
 * Request rate limiting configuration
 */

const rateLimit = require('express-rate-limit');
const { CONFIG } = require('../config');

/**
 * Auth routes rate limiter (stricter)
 */
const authLimiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT.AUTH.windowMs,
    max: CONFIG.RATE_LIMIT.AUTH.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        error: 'Too many authentication attempts. Please try again in 15 minutes.',
        code: 'RATE_LIMIT_AUTH'
    }
});

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT.API.windowMs,
    max: CONFIG.RATE_LIMIT.API.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMIT_API'
    }
});

/**
 * Status check rate limiter (more permissive)
 */
const statusLimiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT.STATUS.windowMs,
    max: CONFIG.RATE_LIMIT.STATUS.max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { 
        error: 'Too many status checks.',
        code: 'RATE_LIMIT_STATUS'
    }
});

/**
 * Verification rate limiter (prevent abuse)
 */
const verificationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 verifications per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        error: 'Too many verification requests. Please wait a moment.',
        code: 'RATE_LIMIT_VERIFY'
    }
});

module.exports = {
    authLimiter,
    apiLimiter,
    statusLimiter,
    verificationLimiter
};
