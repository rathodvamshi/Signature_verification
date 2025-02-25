const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
    fileName: String,
    label: String,
    confidence: Number,
    timestamp: { type: Date, default: Date.now },
});

const verificationModel = mongoose.model('Verification', verificationSchema);

module.exports = verificationModel;
