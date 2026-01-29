/**
 * ============================================
 * APPLICATION CONFIGURATION
 * ============================================
 * Centralized configuration management
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'models', '.env') });

const CONFIG = {
    // Server
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // JWT Authentication
    JWT_SECRET: process.env.JWT_SECRET || 'your-secure-jwt-secret-change-in-production',
    JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
    
    // Database
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'SignatureVerification',
    MONGODB_MAX_POOL: parseInt(process.env.MONGODB_MAX_POOL || '20'),
    MONGODB_MIN_POOL: parseInt(process.env.MONGODB_MIN_POOL || '5'),
    
    // Paths
    UPLOAD_DIR: path.join(__dirname, '..', 'uploads'),
    MODELS_DIR: path.join(__dirname, '..', 'trained_models'),
    TEMPLATES_DIR: path.join(__dirname, '..', '..', 'templates'),
    
    // Cookie settings - adjusted for both development and production
    COOKIE_OPTIONS: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser handle
    },
    
    // Rate limiting
    RATE_LIMIT: {
        AUTH: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 20
        },
        API: {
            windowMs: 60 * 1000, // 1 minute
            max: 100
        },
        STATUS: {
            windowMs: 60 * 1000,
            max: 500
        }
    },
    
    // File upload
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: /jpeg|jpg|png|gif|bmp/
};

// Available trained models (with aliases)
const TRAINED_USERS = {
    'vamshi': path.join(CONFIG.MODELS_DIR, 'vamshi.h5'),
    'vijay': path.join(CONFIG.MODELS_DIR, 'vijay.h5'),
    'yashwant': path.join(CONFIG.MODELS_DIR, 'yashwant.h5'),
    'yash': path.join(CONFIG.MODELS_DIR, 'yashwant.h5'), // Alias
    'naveen': path.join(CONFIG.MODELS_DIR, 'naveen.h5'),
    'anirudh': path.join(CONFIG.MODELS_DIR, 'anirudh.h5')
};

module.exports = { CONFIG, TRAINED_USERS };
