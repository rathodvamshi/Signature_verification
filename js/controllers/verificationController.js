/**
 * ============================================
 * VERIFICATION CONTROLLER
 * ============================================
 * Handles signature verification operations
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const verificationModel = require('../models/verification');
const { CONFIG, TRAINED_USERS } = require('../config');
const { deleteFile, moveToHistory } = require('../middleware/upload');

/**
 * Verify a signature
 * POST /api/verify/predict
 */
const verifySignature = async (req, res) => {
    const file = req.file;

    try {
        let { username } = req.body;
        if (username) username = username.toLowerCase().trim();

        // Check if model exists for this user
        const modelPath = TRAINED_USERS[username];
        if (!modelPath || !fs.existsSync(modelPath)) {
            deleteFile(file?.path);

            // Get available models that actually exist
            const availableModels = Object.entries(TRAINED_USERS)
                .filter(([name, path]) => fs.existsSync(path))
                .map(([name]) => name)
                .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates

            return res.status(400).json({
                error: `No trained model found for "${username}"`,
                availableModels,
                hint: `Try one of: ${availableModels.join(', ')}`
            });
        }

        // Execute Python ML script
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
        const pythonScript = path.join(__dirname, '..', 'app.py');

        const result = await runPythonVerification(pythonCommand, pythonScript, file.path, modelPath);

        // Save to history
        let imageAccessPath = null;
        if (req.user) {
            imageAccessPath = moveToHistory(file, req.user.userid);

            try {
                await verificationModel.create({
                    userId: req.user.userid,
                    fileName: file.originalname,
                    imagePath: imageAccessPath,
                    label: result.label,
                    confidence: result.confidence,
                    verifiedFor: username,
                    timestamp: new Date()
                });
            } catch (saveErr) {
                console.error('Error saving verification record:', saveErr);
            }
        } else {
            deleteFile(file.path);
        }

        res.json({
            success: true,
            label: result.label,
            confidence: result.confidence,
            imagePath: imageAccessPath,
            verifiedFor: username
        });

    } catch (err) {
        console.error('Verification error:', err);
        deleteFile(file?.path);
        res.status(500).json({ error: err.message || 'Verification failed' });
    }
};

/**
 * Run Python verification script
 */
const runPythonVerification = (pythonCommand, scriptPath, imagePath, modelPath) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn(pythonCommand, [scriptPath, imagePath, modelPath]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('Python error:', stderr);
                reject(new Error('Error processing signature'));
                return;
            }

            try {
                const lines = stdout.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const parts = lastLine.split(' with ');

                if (parts.length < 2) {
                    reject(new Error('Invalid response from verification model'));
                    return;
                }

                const label = parts[0];
                const confidence = parseFloat(parts[1].replace('%confidence', '').replace('%', ''));

                resolve({ label, confidence });
            } catch (parseError) {
                console.error('Parse error:', stdout);
                reject(new Error('Error parsing verification result'));
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Python process error:', err);
            reject(new Error('Failed to run verification model'));
        });
    });
};

/**
 * Get verification history
 * GET /api/verify/history
 */
const getHistory = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userid);
        const { page, limit, skip } = req.pagination;
        const { search, date, status } = req.query;

        // Build query
        const query = { userId };

        if (search) {
            query.verifiedFor = { $regex: search, $options: 'i' };
        }

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.timestamp = { $gte: startDate, $lte: endDate };
        }

        if (status && status !== 'all') {
            query.label = status === 'genuine' ? 'Genuine' : 'Forged';
        }

        // Execute queries in parallel
        const [records, total, stats] = await Promise.all([
            verificationModel
                .find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            verificationModel.countDocuments(query),
            verificationModel.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        genuine: { $sum: { $cond: [{ $eq: ['$label', 'Genuine'] }, 1, 0] } },
                        forged: { $sum: { $cond: [{ $eq: ['$label', 'Forged'] }, 1, 0] } },
                        avgConfidence: { $avg: '$confidence' }
                    }
                }
            ])
        ]);

        // Check if image files exist and clear invalid paths
        const processedRecords = records.map(record => {
            if (record.imagePath) {
                const relativePath = record.imagePath.replace('/uploads/', '');
                const filePath = path.join(CONFIG.UPLOAD_DIR, relativePath);
                if (!fs.existsSync(filePath)) {
                    // Image file doesn't exist, clear the path
                    record.imagePath = null;
                }
            }
            return record;
        });

        const summary = stats[0] || { total: 0, genuine: 0, forged: 0, avgConfidence: 0 };
        summary.successRate = summary.total > 0
            ? parseFloat((summary.genuine / summary.total * 100).toFixed(1))
            : 0;

        res.json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            records: processedRecords,
            summary
        });

    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Failed to fetch verification history' });
    }
};

/**
 * Delete history item
 * DELETE /api/verify/history/:id
 */
const deleteHistoryItem = async (req, res) => {
    try {
        const record = await verificationModel.findOne({
            _id: req.params.id,
            userId: req.user.userid
        });

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Delete associated image file
        if (record.imagePath) {
            const relativePath = record.imagePath.replace('/uploads', '');
            const filePath = path.join(CONFIG.UPLOAD_DIR, relativePath);
            deleteFile(filePath);
        }

        await verificationModel.deleteOne({ _id: req.params.id });

        res.json({ success: true, message: 'Record deleted successfully' });

    } catch (err) {
        console.error('Error deleting history item:', err);
        res.status(500).json({ error: 'Failed to delete record' });
    }
};

/**
 * Bulk delete history items
 * POST /api/verify/history/bulk-delete
 */
const bulkDeleteHistory = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No IDs provided' });
        }

        // Validate all IDs are valid ObjectIds
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return res.status(400).json({ error: 'No valid IDs provided' });
        }

        // Find records that belong to this user
        const records = await verificationModel.find({
            _id: { $in: validIds },
            userId: req.user.userid
        }).lean();

        if (records.length === 0) {
            return res.status(404).json({ error: 'No matching records found' });
        }

        // Delete associated image files
        for (const record of records) {
            if (record.imagePath) {
                const relativePath = record.imagePath.replace('/uploads', '');
                const filePath = path.join(CONFIG.UPLOAD_DIR, relativePath);
                deleteFile(filePath);
            }
        }

        // Delete records
        const result = await verificationModel.deleteMany({
            _id: { $in: records.map(r => r._id) },
            userId: req.user.userid
        });

        res.json({
            success: true,
            message: `${result.deletedCount} record(s) deleted`,
            deletedCount: result.deletedCount
        });

    } catch (err) {
        console.error('Error bulk deleting history:', err);
        res.status(500).json({ error: 'Failed to delete records' });
    }
};

/**
 * Clear all history
 * DELETE /api/verify/history
 */
const clearHistory = async (req, res) => {
    try {
        const records = await verificationModel.find({ userId: req.user.userid }).lean();

        // Delete all associated images
        for (const record of records) {
            if (record.imagePath) {
                const relativePath = record.imagePath.replace('/uploads', '');
                const filePath = path.join(CONFIG.UPLOAD_DIR, relativePath);
                deleteFile(filePath);
            }
        }

        await verificationModel.deleteMany({ userId: req.user.userid });

        res.json({
            success: true,
            message: 'All history cleared',
            deletedCount: records.length
        });

    } catch (err) {
        console.error('Error clearing history:', err);
        res.status(500).json({ error: 'Failed to clear history' });
    }
};

/**
 * Get global stats
 * GET /api/stats
 */
const getGlobalStats = async (req, res) => {
    try {
        const [totalVerifications, totalUsers, recentStats] = await Promise.all([
            verificationModel.countDocuments(),
            mongoose.connection.db.collection('users').countDocuments(),
            verificationModel.aggregate([
                {
                    $group: {
                        _id: null,
                        genuine: { $sum: { $cond: [{ $eq: ['$label', 'Genuine'] }, 1, 0] } },
                        forged: { $sum: { $cond: [{ $eq: ['$label', 'Forged'] }, 1, 0] } }
                    }
                }
            ])
        ]);

        const stats = recentStats[0] || { genuine: 0, forged: 0 };

        res.json({
            totalVerifications,
            totalUsers,
            genuineCount: stats.genuine,
            forgedCount: stats.forged,
            availableModels: Object.keys(TRAINED_USERS).filter((name, i, arr) => arr.indexOf(name) === i)
        });

    } catch (err) {
        console.error('Error fetching global stats:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

/**
 * Get available models
 * GET /api/verify/models
 */
const getAvailableModels = (req, res) => {
    const models = Object.entries(TRAINED_USERS)
        .filter(([name, modelPath]) => fs.existsSync(modelPath))
        .map(([name, modelPath]) => ({
            name,
            available: true
        }))
        .filter((model, index, arr) =>
            arr.findIndex(m => m.name === model.name) === index
        );

    res.json({ success: true, models });
};

module.exports = {
    verifySignature,
    getHistory,
    deleteHistoryItem,
    bulkDeleteHistory,
    clearHistory,
    getGlobalStats,
    getAvailableModels
};
