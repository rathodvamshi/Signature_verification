const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number },
    college: { type: String },
    bio: { type: String },
    profileImage: { type: String }, // Path to profile image
    tokenVersion: { type: Number, default: 0 } // Used for invalidating tokens
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Indexes for faster lookups
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;