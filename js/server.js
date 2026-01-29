/**
 * ============================================
 * SIGNATURE VERIFICATION SERVER
 * ============================================
 * Express.js backend with MongoDB authentication
 * and Python ML model integration
 * 
 * Architecture:
 * - config/     → Application configuration
 * - middleware/ → Auth, validation, upload, rate limiting
 * - controllers/→ Business logic
 * - routes/     → Route definitions
 * - models/     → Database models
 */

const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const morgan = require('morgan');
const helmet = require('helmet');

// Load configuration
const { CONFIG, TRAINED_USERS } = require('./config');

// Initialize Express app
const app = express();

// Trust proxy (for Render, Heroku, etc.)
app.set('trust proxy', 1);

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Compression
app.use(compression());

// Request logging (disable in production if needed)
if (CONFIG.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// ============================================
// STATIC FILES
// ============================================

const staticCacheOpts = { 
    maxAge: CONFIG.NODE_ENV === 'production' ? '7d' : '0', 
    etag: true 
};

app.use('/css', express.static(path.join(__dirname, '../templates/css'), staticCacheOpts));
app.use('/js', express.static(path.join(__dirname, '../templates/js'), staticCacheOpts));
app.use('/assets', express.static(path.join(__dirname, '../templates/assets'), staticCacheOpts));
app.use('/uploads', express.static(CONFIG.UPLOAD_DIR, { maxAge: '1h', etag: true }));

// ============================================
// DATABASE CONNECTION
// ============================================

const connectDatabase = async () => {
    if (!CONFIG.MONGODB_URI) {
        console.error('❌ MONGODB_URI is missing. Please set it in environment variables.');
        process.exit(1);
    }

    const maskedUri = CONFIG.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
    console.log(`📡 Connecting to MongoDB: ${maskedUri}`);

    try {
        await mongoose.connect(CONFIG.MONGODB_URI, {
            dbName: CONFIG.MONGODB_DB_NAME,
            maxPoolSize: CONFIG.MONGODB_MAX_POOL,
            minPoolSize: CONFIG.MONGODB_MIN_POOL,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000
        });
        
        console.log(`✅ Connected to MongoDB (${CONFIG.MONGODB_DB_NAME})`);
        
        // Database health check
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📊 Database has ${collections.length} collections`);
        
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('💡 Hint: Check your database credentials and network access.');
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
});

// ============================================
// ROUTES
// ============================================

const { configureRoutes } = require('./routes');
configureRoutes(app);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
            error: 'Endpoint not found',
            path: req.path,
            method: req.method
        });
    }
    res.status(404).sendFile(path.join(__dirname, '../templates', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🔥 Server error:', err);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }
    
    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large' });
    }
    
    res.status(500).json({ 
        error: CONFIG.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message 
    });
});

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async () => {
    // Connect to database first
    await connectDatabase();
    
    // Start listening
    app.listen(CONFIG.PORT, () => {
        // Check model availability
        const modelStatus = Object.entries(TRAINED_USERS)
            .filter((entry, index, arr) => 
                arr.findIndex(e => e[1] === entry[1]) === index // Remove duplicate paths
            )
            .map(([name, modelPath]) => {
                const exists = fs.existsSync(modelPath);
                return `${exists ? '✅' : '❌'} ${name}`;
            });

        console.log(`
╔══════════════════════════════════════════════════╗
║     🖊️  Signature Verification Server             ║
╠══════════════════════════════════════════════════╣
║  Environment: ${CONFIG.NODE_ENV.padEnd(33)}║
║  Server URL:  http://localhost:${String(CONFIG.PORT).padEnd(18)}║
║                                                  ║
║  Trained Models:                                 ║
║  ${modelStatus.slice(0, 3).join('  ').padEnd(48)}║
║  ${modelStatus.slice(3).join('  ').padEnd(48)}║
║                                                  ║
║  API Endpoints:                                  ║
║  • POST /api/auth/register                       ║
║  • POST /api/auth/login                          ║
║  • GET  /api/auth/status                         ║
║  • GET  /api/user/profile                        ║
║  • POST /api/user/profile                        ║
║  • POST /api/verify/predict                      ║
║  • GET  /api/verify/history                      ║
║  • GET  /api/stats                               ║
╚══════════════════════════════════════════════════╝
        `);
    });
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

// Start the server
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

module.exports = app; // Export for testing
