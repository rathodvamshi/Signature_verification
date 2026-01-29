/**
 * ============================================
 * PAGES CONTROLLER
 * ============================================
 * Serves HTML pages
 */

const path = require('path');
const { CONFIG } = require('../config');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

/**
 * Serve home page
 */
const home = (req, res) => {
    res.sendFile(path.join(TEMPLATES_DIR, 'index.html'));
};

/**
 * Serve auth page (login/signup)
 */
const auth = (req, res) => {
    res.sendFile(path.join(TEMPLATES_DIR, 'auth.html'));
};

/**
 * Serve models page
 */
const models = (req, res) => {
    res.sendFile(path.join(TEMPLATES_DIR, 'models.html'));
};

/**
 * Serve verify page
 */
const verify = (req, res) => {
    res.sendFile(path.join(TEMPLATES_DIR, 'verify.html'));
};

/**
 * Serve profile page
 */
const profile = (req, res) => {
    res.sendFile(path.join(TEMPLATES_DIR, 'profile.html'));
};

/**
 * Serve history page
 */
const history = (req, res) => {
    res.sendFile(path.join(TEMPLATES_DIR, 'history.html'));
};

/**
 * Health check endpoint
 */
const healthCheck = (req, res) => {
    const mongoose = require('mongoose');
    
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
        environment: CONFIG.NODE_ENV
    });
};

/**
 * 404 handler - serve home page
 */
const notFound = (req, res) => {
    // For API routes, return JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
    // For page routes, serve home page
    res.status(404).sendFile(path.join(TEMPLATES_DIR, 'index.html'));
};

module.exports = {
    home,
    auth,
    models,
    verify,
    profile,
    history,
    healthCheck,
    notFound
};
