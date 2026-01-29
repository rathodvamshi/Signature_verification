/**
 * ============================================
 * SIGNATURE VERIFICATION SERVER
 * ============================================
 * Express.js backend with MongoDB authentication
 * and Python ML model integration
 */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { spawn } = require('child_process');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'models', '.env') });

const app = express();

// Required for proxy environments like Render
app.set('trust proxy', 1);

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'your-secure-jwt-secret-change-in-production',
    JWT_EXPIRY: '24h',
    MONGODB_URI: process.env.MONGODB_URI,
    UPLOAD_DIR: path.join(__dirname, 'uploads'),
    MODELS_DIR: path.join(__dirname, 'trained_models')
};

// ============================================
// DATABASE MODELS
// ============================================
const userModel = require('./models/user');
const verificationModel = require('./models/verification');

// Available trained models
const TRAINED_USERS = {
    'vamshi': path.join(CONFIG.MODELS_DIR, 'vamshi.h5'),
    'vijay': path.join(CONFIG.MODELS_DIR, 'vijay.h5'),
    'yashwant': path.join(CONFIG.MODELS_DIR, 'yashwant.h5'),
    'naveen': path.join(CONFIG.MODELS_DIR, 'naveen.h5')
};

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(morgan('dev'));

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        },
    },
}));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs for auth
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false
});

// Pro Suggestion: Separated status limiter to prevent UI locks
const statusLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500, // Allow up to 500 status checks per minute (for active multi-tab users)
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Only count failures toward limit
});

// ============================================
// DEBUGGING & PATHS
// ============================================
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(PROJECT_ROOT, 'templates');

console.log('📂 Project Root:', PROJECT_ROOT);
console.log('📂 Templates Dir:', TEMPLATES_DIR);

// ============================================
// MIDDLEWARE
// ============================================

// 1. Force No-Cache for HTML pages (Fixes 304 issues)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/css') && !req.path.startsWith('/js') && !req.path.startsWith('/assets')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

// 2. Logging for CSS requests
app.use('/css', (req, res, next) => {
    console.log(`🎨 CSS Request: ${req.url}`);
    next();
});

// 4. Static Files Serving
// Use absolute paths and explicit mapping
app.use('/css', express.static(path.join(TEMPLATES_DIR, 'css')));
app.use('/js', express.static(path.join(TEMPLATES_DIR, 'js')));
app.use('/assets', express.static(path.join(TEMPLATES_DIR, 'assets')));
app.use('/uploads', express.static(CONFIG.UPLOAD_DIR));

// Ensure upload directory exists
if (!fs.existsSync(CONFIG.UPLOAD_DIR)) {
    fs.mkdirSync(CONFIG.UPLOAD_DIR, { recursive: true });
}

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CONFIG.UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|bmp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// ============================================
// DATABASE CONNECTION
// ============================================
if (!CONFIG.MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing. Please set it in Render Environment Variables.');
    process.exit(1);
} else {
    const maskedUri = CONFIG.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
    console.log(`📡 Attempting to connect to: ${maskedUri}`);
}

const mongoOptions = {
    dbName: process.env.MONGODB_DB_NAME || 'SignatureVerification',
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL || '20'),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL || '5'),
    serverSelectionTimeoutMS: 30000, // Increased to 30s for cloud stability
    socketTimeoutMS: 45000
};
mongoose.connect(CONFIG.MONGODB_URI, mongoOptions)
    .then(() => console.log(`✅ Connected to MongoDB (${mongoOptions.dbName})`))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.name, err.message);
        console.error('💡 Hint: Check your database password and White-listing in Atlas.');
    });

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
async function isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);

        // Extra security: Verify tokenVersion to support global logout
        const user = await userModel.findById(decoded.userid);
        if (!user || user.tokenVersion !== decoded.tokenVersion) {
            res.clearCookie('token');
            return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
}

/**
 * Page-level authentication middleware (Redirects to login)
 */
async function protectPageRoute(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        const nextUrl = encodeURIComponent(req.originalUrl || '/');
        return res.redirect(`/login?next=${nextUrl}`);
    }

    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        const user = await userModel.findById(decoded.userid);

        if (!user || user.tokenVersion !== decoded.tokenVersion) {
            res.clearCookie('token');
            const nextUrl = encodeURIComponent(req.originalUrl || '/');
            return res.redirect(`/login?next=${nextUrl}`);
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('token');
        const nextUrl = encodeURIComponent(req.originalUrl || '/');
        return res.redirect(`/login?next=${nextUrl}`);
    }
}

// Optional auth - doesn't require login but attaches user if logged in
function optionalAuth(req, res, next) {
    const token = req.cookies.token;

    if (token) {
        try {
            req.user = jwt.verify(token, CONFIG.JWT_SECRET);
        } catch (err) {
            res.clearCookie('token');
        }
    }
    next();
}

// ============================================
// ROUTES - PAGES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
    });
});

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'index.html'));
});

// Auth pages (Unified Login/Signup)
app.get(['/login', '/signup', '/auth'], (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'auth.html'));
});

// Trained Models page
app.get(['/models', '/models.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'models.html'));
});

// Verification page
app.get(['/verify', '/verify.html'], protectPageRoute, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'verify.html'));
});

// Profile page
app.get(['/profile', '/profile.html'], protectPageRoute, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'profile.html'));
});

// History page
app.get(['/history', '/history.html'], protectPageRoute, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'history.html'));
});

// ============================================
// ROUTES - AUTHENTICATION
// ============================================

// Register new user
app.post(['/register', '/api/auth/register'], async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const normalizedEmail = email ? email.toLowerCase() : '';

        // Validation
        if (!normalizedEmail || !password || !username) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = await userModel.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await userModel.create({
            username,
            email: normalizedEmail,
            password: hashedPassword,
            tokenVersion: 0
        });

        // Generate JWT token
        const token = jwt.sign(
            {
                email: newUser.email,
                userid: newUser._id,
                username: newUser.username,
                tokenVersion: newUser.tokenVersion
            },
            CONFIG.JWT_SECRET,
            { expiresIn: CONFIG.JWT_EXPIRY }
        );

        // Set cookie and redirect
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({ success: true, redirectUrl: '/profile' });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login
app.post(['/login', '/api/auth/login'], async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const user = await userModel.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            {
                email: user.email,
                userid: user._id,
                username: user.username,
                tokenVersion: user.tokenVersion || 0
            },
            CONFIG.JWT_SECRET,
            { expiresIn: CONFIG.JWT_EXPIRY }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, redirectUrl: '/profile' });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Logout
app.get(['/logout', '/api/auth/logout'], (req, res) => {
    res.clearCookie('token');
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({ success: true });
    }
    res.redirect('/');
});

// ============================================
// ROUTES - AUTH STATUS CHECK
// ============================================

// Check if user is logged in (for dynamic navbar)
app.get(['/api/auth-status', '/api/auth/status'], async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.json({ isLoggedIn: false });
    }

    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);

        // Verify token version
        const user = await userModel.findById(decoded.userid);
        if (!user || user.tokenVersion !== decoded.tokenVersion) {
            res.clearCookie('token');
            return res.json({ isLoggedIn: false });
        }

        res.json({
            isLoggedIn: true,
            user: {
                username: decoded.username,
                email: decoded.email
            }
        });
    } catch (err) {
        res.clearCookie('token');
        res.json({ isLoggedIn: false });
    }
});

// ============================================
// ROUTES - PROFILE
// ============================================

// Get profile page
app.get('/profile', isLoggedIn, async (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'profile.html'));
});

// Get user details API
app.get(['/get-user-details', '/api/user/profile'], isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findById(req.user.userid).select('-password').lean();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Count verifications from the Verification model
        const verificationsCount = await verificationModel.countDocuments({ userId: req.user.userid });

        res.json({
            username: user.username,
            email: user.email,
            age: user.age || 'Not provided',
            college: user.college || 'Not provided',
            bio: user.bio || 'Not provided',
            profileImage: user.profileImage || null,
            verificationsCount: verificationsCount
        });

    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

// Update profile
// Update profile (supports image upload)
app.post(['/update-profile', '/api/user/profile'], isLoggedIn, upload.single('profileImage'), async (req, res) => {
    try {
        const { email, age, college, bio } = req.body;
        const file = req.file;

        // Validate email if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check if email is taken by another user
        if (email) {
            const existingUser = await userModel.findOne({
                email,
                _id: { $ne: req.user.userid }
            }).lean();
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        // Prepare update object
        const updateData = {};
        if (email) updateData.email = email;
        if (age) updateData.age = parseInt(age);
        if (college) updateData.college = college;
        if (bio) updateData.bio = bio;

        // Handle profile image
        if (file) {
            // Delete old image if exists
            const currentUser = await userModel.findById(req.user.userid);
            if (currentUser && currentUser.profileImage) {
                const oldPath = path.join(__dirname, 'uploads', path.basename(currentUser.profileImage));
                if (fs.existsSync(oldPath)) {
                    try { fs.unlinkSync(oldPath); } catch (e) { }
                }
            }
            // Save new relative path
            updateData.profileImage = `/uploads/${file.filename}`;
        }

        // Update user
        const updatedUser = await userModel.findByIdAndUpdate(
            req.user.userid,
            updateData,
            { new: true }
        ).select('-password').lean();

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            email: updatedUser.email,
            age: updatedUser.age || 'Not provided',
            college: updatedUser.college || 'Not provided',
            bio: updatedUser.bio || 'Not provided',
            profileImage: updatedUser.profileImage || null
        });

    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ============================================
// ROUTES - SIGNATURE VERIFICATION
// ============================================

// Predict/verify signature
app.post(['/predict', '/api/verify/predict'], isLoggedIn, upload.single('file'), async (req, res) => {
    try {
        let { username } = req.body;
        const file = req.file;

        // Validation
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Normalize username
        username = username.toLowerCase().trim();

        // Check if model exists for this user
        const modelPath = TRAINED_USERS[username];
        if (!modelPath || !fs.existsSync(modelPath)) {
            // Clean up uploaded file
            fs.unlink(file.path, () => { });
            return res.status(400).json({
                error: `No trained model found for "${username}". Available: ${Object.keys(TRAINED_USERS).join(', ')}`
            });
        }

        // Use 'python3' for Linux/Render, 'python' for Windows
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
        const pythonScript = path.join(__dirname, 'app.py');
        const pythonProcess = spawn(pythonCommand, [pythonScript, file.path, modelPath]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error('Python script error:', stderr);
                fs.unlink(file.path, () => { }); // Delete on error
                return res.status(500).json({ error: 'Error processing signature' });
            }

            try {
                // Parse result from the last line (in case of warnings)
                const lines = stdout.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const result = lastLine.split(' with ');
                const label = result[0];
                const confidence = parseFloat(result[1].replace('%confidence', '').replace('%', ''));

                // Move file to permanent storage if user is logged in
                let imageAccessPath = null;

                if (req.user) {
                    try {
                        const historyDir = path.join(CONFIG.UPLOAD_DIR, 'history');
                        if (!fs.existsSync(historyDir)) {
                            fs.mkdirSync(historyDir, { recursive: true });
                        }

                        // Use a cleaned filename to avoid path issues
                        const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
                        const newFileName = `hist_${req.user.userid}_${Date.now()}_${cleanOriginalName}`;
                        const newPath = path.join(historyDir, newFileName);

                        // Copy file instead of rename to avoid Windows lock issues
                        // Then delete the original
                        fs.copyFileSync(file.path, newPath);
                        try { fs.unlinkSync(file.path); } catch (e) { /* ignore unlink error */ }

                        imageAccessPath = `/uploads/history/${newFileName}`;

                        // Save record
                        await verificationModel.create({
                            userId: req.user.userid,
                            fileName: file.originalname,
                            imagePath: imageAccessPath,
                            label,
                            confidence,
                            verifiedFor: username
                        });
                    } catch (saveErr) {
                        console.error('Error saving history image/record:', saveErr);
                        // Try to save record without image if image save failed
                        try {
                            await verificationModel.create({
                                userId: req.user.userid,
                                fileName: file.originalname,
                                imagePath: null,
                                label,
                                confidence,
                                verifiedFor: username
                            });
                        } catch (e) { console.error('Failed to save fallback record', e); }
                    }
                } else {
                    // Cleanup temp file if not logged in
                    try { fs.unlinkSync(file.path); } catch (e) { }
                }
                res.json({ label, confidence, imagePath: imageAccessPath });

            } catch (parseError) {
                console.error('Error parsing Python output:', stdout);
                if (fs.existsSync(file.path)) fs.unlink(file.path, () => { });
                res.status(500).json({ error: 'Error parsing verification result' });
            }
        });

    } catch (err) {
        console.error('Prediction error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Get verification history
app.get(['/verification-history', '/api/verify/history'], isLoggedIn, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userid);
        const page = Math.max(parseInt(req.query.page || '1'), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '20'), 1), 100);
        const skip = (page - 1) * limit;

        const [records, total] = await Promise.all([
            verificationModel
                .find({ userId })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            verificationModel.countDocuments({ userId })
        ]);

        // Pro Detail: Add summary stats to history response
        const stats = await verificationModel.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    genuine: { $sum: { $cond: [{ $eq: ["$label", "Genuine"] }, 1, 0] } },
                    forged: { $sum: { $cond: [{ $eq: ["$label", "Forged"] }, 1, 0] } }
                }
            }
        ]);

        res.json({
            page,
            limit,
            total,
            records,
            summary: stats[0] || { total: 0, genuine: 0, forged: 0 }
        });

    } catch (err) {
        console.error('Error fetching history for user:', req.user.userid, err);
        res.status(500).json({ error: 'Failed to fetch verification history' });
    }
});

// Get global stats
app.get('/api/stats', async (req, res) => {
    try {
        const totalVerifications = await verificationModel.countDocuments();
        res.json({ totalVerifications });
    } catch (err) {
        console.error('Error fetching global stats:', err);
        res.status(500).json({ error: 'Failed to fetch global stats' });
    }
});

// Delete history item
app.delete(['/api/history/:id', '/api/verify/history/:id'], isLoggedIn, async (req, res) => {
    try {
        const record = await verificationModel.findOne({
            _id: req.params.id,
            userId: req.user.userid
        });

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Delete associated image file if exists
        if (record.imagePath) {
            const relativePath = record.imagePath.replace('/uploads', '');
            const filePath = path.join(CONFIG.UPLOAD_DIR, relativePath);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, () => { });
            }
        }

        await verificationModel.deleteOne({ _id: req.params.id });

        res.json({ message: 'Record deleted successfully' });
    } catch (err) {
        console.error('Error deleting history:', err);
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../templates', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
app.listen(CONFIG.PORT, () => {
    // Check which models are actually available on disk
    const statusIcons = Object.entries(TRAINED_USERS).map(([name, path]) => {
        const exists = fs.existsSync(path);
        return `${exists ? '✅' : '❌'} ${name}`;
    });

    // Pro Diagnostic: Database Health Check
    if (mongoose.connection.readyState === 1) {
        mongoose.connection.db.collection('verifications').countDocuments().then(count => {
            console.log(`📊 History Database Check: ${count} total verification records found in cloud.`);
        }).catch(err => console.error('📊 History Database Error:', err));
    }

    console.log(`
╔══════════════════════════════════════════════╗
║     🖊️  Signature Verification Server         ║
╠══════════════════════════════════════════════╣
║  Server running at:                          ║
║  → http://localhost:${CONFIG.PORT}                     ║
║                                              ║
║  Trained Models Status:                      ║
║  ${statusIcons.slice(0, 3).join('  ')}                 ║
║  ${statusIcons.slice(3).join('  ')}                 ║
╚══════════════════════════════════════════════╝
    `);
});
