/**
 * ============================================
 * AUTH CONTROLLER
 * ============================================
 * Handles user authentication operations
 */

const bcrypt = require('bcrypt');
const userModel = require('../models/user');
const { generateToken, setAuthCookie } = require('../middleware/auth');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const existingUser = await userModel.findOne({ email }).lean();
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check username uniqueness
        const existingUsername = await userModel.findOne({ username }).lean();
        if (existingUsername) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await userModel.create({
            username,
            email,
            password: hashedPassword,
            tokenVersion: 0,
            createdAt: new Date()
        });

        // Generate token and set cookie
        const token = generateToken(newUser);
        setAuthCookie(res, token);
        
        console.log(`✅ New user registered: ${newUser.email}`);

        res.status(201).json({ 
            success: true, 
            message: 'Registration successful',
            redirectUrl: '/profile',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        let user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Migrate legacy users: ensure tokenVersion exists in database
        if (user.tokenVersion === undefined || user.tokenVersion === null) {
            console.log(`🔄 Migrating legacy user ${user.email}: setting tokenVersion to 0`);
            user = await userModel.findByIdAndUpdate(
                user._id,
                { $set: { tokenVersion: 0 } },
                { new: true }
            );
        }

        // Generate token and set cookie
        const token = generateToken(user);
        setAuthCookie(res, token);
        
        // Check redirect from query string
        const nextUrl = req.query.next || '/profile';
        const safeRedirectUrl = nextUrl.startsWith('/') ? nextUrl : '/profile';

        console.log(`✅ User logged in: ${user.email}, tokenVersion: ${user.tokenVersion}`);

        res.json({ 
            success: true, 
            message: 'Login successful',
            redirectUrl: safeRedirectUrl,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
};

/**
 * Logout user
 * GET /api/auth/logout
 */
const logout = (req, res) => {
    // Clear cookie with proper path
    res.clearCookie('token', { path: '/' });
    
    console.log('👋 User logged out');
    
    // Check if AJAX request
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('json'));
    
    if (isAjax) {
        return res.json({ success: true, message: 'Logged out successfully' });
    }
    
    res.redirect('/');
};

/**
 * Get auth status (for dynamic navbar)
 * GET /api/auth/status
 */
const getStatus = async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.json({ isLoggedIn: false });
    }

    try {
        const jwt = require('jsonwebtoken');
        const { CONFIG } = require('../config');
        
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        const user = await userModel.findById(decoded.userid).select('tokenVersion username email').lean();

        if (!user) {
            res.clearCookie('token', { path: '/' });
            return res.json({ isLoggedIn: false });
        }

        // Handle legacy users: treat undefined/null tokenVersion as 0
        const dbTokenVersion = user.tokenVersion ?? 0;
        const tokenVersion = decoded.tokenVersion ?? 0;

        if (dbTokenVersion !== tokenVersion) {
            res.clearCookie('token', { path: '/' });
            return res.json({ isLoggedIn: false });
        }

        res.json({
            isLoggedIn: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        res.clearCookie('token', { path: '/' });
        res.json({ isLoggedIn: false });
    }
};

/**
 * Invalidate all sessions (global logout)
 * POST /api/auth/invalidate-sessions
 */
const invalidateAllSessions = async (req, res) => {
    try {
        await userModel.findByIdAndUpdate(req.user.userid, {
            $inc: { tokenVersion: 1 }
        });

        res.clearCookie('token');
        res.json({ success: true, message: 'All sessions invalidated' });
    } catch (err) {
        console.error('Session invalidation error:', err);
        res.status(500).json({ error: 'Failed to invalidate sessions' });
    }
};

module.exports = {
    register,
    login,
    logout,
    getStatus,
    invalidateAllSessions
};
