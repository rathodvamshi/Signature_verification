/**
 * ============================================
 * USER CONTROLLER
 * ============================================
 * Handles user profile operations
 */

const path = require('path');
const userModel = require('../models/user');
const verificationModel = require('../models/verification');
const { deleteFile } = require('../middleware/upload');
const { CONFIG } = require('../config');

/**
 * Get user profile
 * GET /api/user/profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.userid)
            .select('-password -tokenVersion')
            .lean();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Count verifications
        const verificationsCount = await verificationModel.countDocuments({ 
            userId: req.user.userid 
        });

        res.json({
            username: user.username,
            email: user.email,
            age: user.age || null,
            college: user.college || null,
            bio: user.bio || null,
            profileImage: user.profileImage || null,
            verificationsCount,
            createdAt: user.createdAt
        });

    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

/**
 * Update user profile
 * POST /api/user/profile
 */
const updateProfile = async (req, res) => {
    try {
        const { email, age, college, bio } = req.body;
        const file = req.file;

        // Check if email is taken by another user
        if (email) {
            const existingUser = await userModel.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.user.userid }
            }).lean();
            
            if (existingUser) {
                // Clean up uploaded file if exists
                if (file) deleteFile(file.path);
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        // Prepare update object
        const updateData = {};
        if (email) updateData.email = email.toLowerCase();
        if (age) updateData.age = parseInt(age);
        if (college !== undefined) updateData.college = college;
        if (bio !== undefined) updateData.bio = bio;

        // Handle profile image
        if (file) {
            // Delete old image if exists
            const currentUser = await userModel.findById(req.user.userid).select('profileImage').lean();
            if (currentUser?.profileImage) {
                const oldPath = path.join(CONFIG.UPLOAD_DIR, path.basename(currentUser.profileImage));
                deleteFile(oldPath);
            }
            updateData.profileImage = `/uploads/${file.filename}`;
        }

        // Update user
        const updatedUser = await userModel.findByIdAndUpdate(
            req.user.userid,
            { $set: updateData },
            { new: true }
        ).select('-password -tokenVersion').lean();

        if (!updatedUser) {
            if (file) deleteFile(file.path);
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            email: updatedUser.email,
            age: updatedUser.age || null,
            college: updatedUser.college || null,
            bio: updatedUser.bio || null,
            profileImage: updatedUser.profileImage || null
        });

    } catch (err) {
        console.error('Error updating profile:', err);
        if (req.file) deleteFile(req.file.path);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

/**
 * Delete user account
 * DELETE /api/user/profile
 */
const deleteAccount = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.userid);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete profile image if exists
        if (user.profileImage) {
            const imagePath = path.join(CONFIG.UPLOAD_DIR, path.basename(user.profileImage));
            deleteFile(imagePath);
        }

        // Delete all verification records
        await verificationModel.deleteMany({ userId: req.user.userid });

        // Delete user
        await userModel.deleteOne({ _id: req.user.userid });

        res.clearCookie('token');
        res.json({ success: true, message: 'Account deleted successfully' });

    } catch (err) {
        console.error('Error deleting account:', err);
        res.status(500).json({ error: 'Failed to delete account' });
    }
};

/**
 * Change password
 * POST /api/user/change-password
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const user = await userModel.findById(req.user.userid);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const bcrypt = require('bcrypt');
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and invalidate all sessions
        await userModel.findByIdAndUpdate(req.user.userid, {
            password: hashedPassword,
            $inc: { tokenVersion: 1 }
        });

        res.clearCookie('token');
        res.json({ 
            success: true, 
            message: 'Password changed successfully. Please log in again.' 
        });

    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    deleteAccount,
    changePassword
};
