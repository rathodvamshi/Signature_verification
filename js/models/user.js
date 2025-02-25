const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number },
    college: { type: String },
    bio: { type: String },
    verifications: [
        {
            label: { type: String, required: true }, // Forged/Real
            confidence: { type: Number, required: true }, // Confidence score
            fileName: { type: String }, // Optional: File name of the uploaded image
            timestamp: { type: Date, default: Date.now } // Timestamp for the verification
        }
    ]
},{
    timestamps: true // Adds createdAt and updatedAt fields
});

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;