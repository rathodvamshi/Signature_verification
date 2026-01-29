/**
 * ============================================
 * ROUTES INDEX
 * ============================================
 * Central route configuration
 */

const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const verificationRoutes = require('./verificationRoutes');
const pageRoutes = require('./pageRoutes');
const { verification, auth } = require('../controllers');
const { apiLimiter, authLimiter, validateLogin, validateRegistration } = require('../middleware');

/**
 * Configure all routes
 * @param {express.Application} app 
 */
const configureRoutes = (app) => {
    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/verify', verificationRoutes);

    // Global stats endpoint
    app.get('/api/stats', apiLimiter, verification.getGlobalStats);

    // Legacy API route aliases for backward compatibility
    app.get('/api/auth-status', auth.getStatus);
    app.get('/get-user-details', require('../middleware').isLoggedIn, require('../controllers').user.getProfile);
    app.post('/update-profile',
        require('../middleware').isLoggedIn,
        require('../middleware').upload.single('profileImage'),
        require('../controllers').user.updateProfile
    );
    app.post('/predict',
        require('../middleware').isLoggedIn,
        require('../middleware').upload.single('file'),
        require('../middleware').validateVerification,
        verification.verifySignature
    );
    app.get('/verification-history',
        require('../middleware').isLoggedIn,
        require('../middleware').validatePagination,
        verification.getHistory
    );
    app.delete('/api/history/:id',
        require('../middleware').isLoggedIn,
        verification.deleteHistoryItem
    );

    // Legacy auth routes (form submissions)
    app.post('/register', authLimiter, validateRegistration, auth.register);
    app.post('/login', authLimiter, validateLogin, auth.login);

    // Page Routes (must be last to not conflict with API routes)
    app.use('/', pageRoutes);
};

module.exports = { configureRoutes };
