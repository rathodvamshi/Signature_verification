const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    fileName: {
        type: String
    },
    imagePath: {
        type: String // URL path to the saved image
    },
    verifiedFor: {
        type: String,
        required: true
    },
    label: {
        type: String,
        required: true,
        enum: ['Genuine', 'Forged']
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Add index for faster queries
verificationSchema.index({ userId: 1, timestamp: -1 });

const verificationModel = mongoose.model('Verification', verificationSchema);

module.exports = verificationModel;
