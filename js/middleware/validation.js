/**
 * ============================================
 * VALIDATION MIDDLEWARE
 * ============================================
 * Request validation and sanitization
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
};

/**
 * Validate registration input
 */
const validateRegistration = (req, res, next) => {
    const { username, email, password } = req.body;
    const errors = [];

    // Username validation
    if (!username || username.trim().length < 2) {
        errors.push('Username must be at least 2 characters');
    }
    if (username && username.length > 50) {
        errors.push('Username must be less than 50 characters');
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
    }

    // Email validation
    if (!email || !isValidEmail(email)) {
        errors.push('Valid email is required');
    }

    // Password validation
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters');
    }
    if (password && password.length > 128) {
        errors.push('Password must be less than 128 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], errors });
    }

    // Sanitize inputs
    req.body.username = sanitizeString(username);
    req.body.email = email.toLowerCase().trim();
    
    next();
};

/**
 * Validate login input
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    req.body.email = email.toLowerCase().trim();
    next();
};

/**
 * Validate profile update
 */
const validateProfileUpdate = (req, res, next) => {
    const { email, age } = req.body;
    const errors = [];

    if (email && !isValidEmail(email)) {
        errors.push('Invalid email format');
    }

    if (age && (isNaN(parseInt(age)) || parseInt(age) < 1 || parseInt(age) > 150)) {
        errors.push('Age must be a valid number between 1 and 150');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], errors });
    }

    next();
};

/**
 * Validate verification request
 */
const validateVerification = (req, res, next) => {
    const { username } = req.body;

    if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: 'Username is required' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    req.body.username = username.toLowerCase().trim();
    next();
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        
        next();
    };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
    let { page, limit } = req.query;
    
    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    
    req.pagination = { page, limit, skip: (page - 1) * limit };
    next();
};

module.exports = {
    isValidEmail,
    sanitizeString,
    validateRegistration,
    validateLogin,
    validateProfileUpdate,
    validateVerification,
    validateObjectId,
    validatePagination
};
