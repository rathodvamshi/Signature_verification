/**
 * ============================================
 * CONTROLLERS INDEX
 * ============================================
 * Export all controllers from single point
 */

const authController = require('./authController');
const userController = require('./userController');
const verificationController = require('./verificationController');
const pagesController = require('./pagesController');

module.exports = {
    auth: authController,
    user: userController,
    verification: verificationController,
    pages: pagesController
};
