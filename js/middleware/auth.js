/**
 * ============================================
 * AUTHENTICATION MIDDLEWARE
 * ============================================
 * Handles JWT verification and session management
 */

const jwt = require('jsonwebtoken');
const { CONFIG } = require('../config');
const userModel = require('../models/user');

/**
 * API-level authentication middleware
 * Returns JSON error responses for API routes
 */
const isLoggedIn = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ 
            error: 'Authentication required. Please log in.',
            code: 'AUTH_REQUIRED'
        });
    }

    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);

        // Extra security: Verify tokenVersion to support global logout
        const user = await userModel.findById(decoded.userid).select('tokenVersion').lean();
        
        if (!user) {
            res.clearCookie('token', { path: '/' });
            return res.status(401).json({ 
                error: 'User not found. Please log in again.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Handle legacy users: treat undefined/null tokenVersion as 0
        const dbTokenVersion = user.tokenVersion ?? 0;
        const tokenVersion = decoded.tokenVersion ?? 0;

        if (dbTokenVersion !== tokenVersion) {
            res.clearCookie('token', { path: '/' });
            return res.status(401).json({ 
                error: 'Session invalidated. Please log in again.',
                code: 'SESSION_INVALID'
            });
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('token', { path: '/' });
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Session expired. Please log in again.',
                code: 'SESSION_EXPIRED'
            });
        }
        
        return res.status(401).json({ 
            error: 'Invalid session. Please log in again.',
            code: 'SESSION_INVALID'
        });
    }
};

/**
 * Page-level authentication middleware
 * Redirects to login page for protected HTML pages
 */
const protectPageRoute = async (req, res, next) => {
    const token = req.cookies.token;
    const nextUrl = encodeURIComponent(req.originalUrl || '/');

    if (!token) {
        console.log(`🔒 No token found for ${req.originalUrl}, redirecting to login`);
        return res.redirect(`/login?next=${nextUrl}`);
    }

    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        const user = await userModel.findById(decoded.userid).select('tokenVersion username').lean();

        if (!user) {
            console.log(`❌ User not found for token, clearing cookie`);
            res.clearCookie('token', { path: '/' });
            return res.redirect(`/login?next=${nextUrl}&reason=session_expired`);
        }

        // Handle legacy users: treat undefined/null tokenVersion as 0
        const dbTokenVersion = user.tokenVersion ?? 0;
        const tokenVersion = decoded.tokenVersion ?? 0;

        if (dbTokenVersion !== tokenVersion) {
            console.log(`❌ Token version mismatch: db=${dbTokenVersion}, token=${tokenVersion}`);
            res.clearCookie('token', { path: '/' });
            return res.redirect(`/login?next=${nextUrl}&reason=session_expired`);
        }

        req.user = decoded;
        next();
    } catch (err) {
        console.log(`❌ Token verification failed: ${err.message}`);
        res.clearCookie('token', { path: '/' });
        return res.redirect(`/login?next=${nextUrl}&reason=session_expired`);
    }
};

/**
 * Optional authentication middleware
 * Attaches user to request if logged in, but doesn't block if not
 */
const optionalAuth = async (req, res, next) => {
    const token = req.cookies.token;

    if (token) {
        try {
            const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
            const user = await userModel.findById(decoded.userid).select('tokenVersion').lean();
            
            // Handle legacy users: treat undefined/null tokenVersion as 0
            const dbTokenVersion = user?.tokenVersion ?? 0;
            const tokenVersion = decoded.tokenVersion ?? 0;
            
            if (user && dbTokenVersion === tokenVersion) {
                req.user = decoded;
            } else {
                res.clearCookie('token', { path: '/' });
            }
        } catch (err) {
            res.clearCookie('token', { path: '/' });
        }
    }
    next();
};

/**
 * Helper to generate JWT token
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            email: user.email,
            userid: user._id,
            username: user.username,
            tokenVersion: user.tokenVersion || 0
        },
        CONFIG.JWT_SECRET,
        { expiresIn: CONFIG.JWT_EXPIRY }
    );
};

/**
 * Helper to set auth cookie
 */
const setAuthCookie = (res, token) => {
    res.cookie('token', token, CONFIG.COOKIE_OPTIONS);
};

module.exports = {
    isLoggedIn,
    protectPageRoute,
    optionalAuth,
    generateToken,
    setAuthCookie
};
