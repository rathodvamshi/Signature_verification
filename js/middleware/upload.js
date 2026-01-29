/**
 * ============================================
 * FILE UPLOAD MIDDLEWARE
 * ============================================
 * Multer configuration for file uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CONFIG } = require('../config');

// Ensure upload directory exists
if (!fs.existsSync(CONFIG.UPLOAD_DIR)) {
    fs.mkdirSync(CONFIG.UPLOAD_DIR, { recursive: true });
}

// Ensure history directory exists
const historyDir = path.join(CONFIG.UPLOAD_DIR, 'history');
if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
}

/**
 * Storage configuration for general uploads
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CONFIG.UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

/**
 * File filter for images only
 */
const imageFilter = (req, file, cb) => {
    const extname = CONFIG.ALLOWED_FILE_TYPES.test(path.extname(file.originalname).toLowerCase());
    const mimetype = CONFIG.ALLOWED_FILE_TYPES.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, BMP) are allowed'), false);
    }
};

/**
 * General upload middleware
 */
const upload = multer({
    storage,
    limits: { fileSize: CONFIG.MAX_FILE_SIZE },
    fileFilter: imageFilter
});

/**
 * Error handler for multer errors
 */
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: `File too large. Maximum size is ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB` 
            });
        }
        return res.status(400).json({ error: err.message });
    }
    
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    
    next();
};

/**
 * Helper to delete a file safely
 */
const deleteFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            return true;
        } catch (e) {
            console.error('Error deleting file:', e);
            return false;
        }
    }
    return false;
};

/**
 * Helper to move file to history directory
 */
const moveToHistory = (file, userId) => {
    try {
        const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const newFileName = `hist_${userId}_${Date.now()}_${cleanOriginalName}`;
        const newPath = path.join(historyDir, newFileName);

        // Copy file to history directory
        fs.copyFileSync(file.path, newPath);
        
        // Delete original
        deleteFile(file.path);

        return `/uploads/history/${newFileName}`;
    } catch (err) {
        console.error('Error moving file to history:', err);
        return null;
    }
};

module.exports = {
    upload,
    handleUploadError,
    deleteFile,
    moveToHistory
};
