const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/database');
const { hashPassword, comparePassword, generateToken, authenticate } = require('../utils/auth');
const { logAudit } = require('../utils/audit');
const logger = require('../utils/logger');

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;
    
    console.log(`🔐 Login attempt for username: ${username}`);

    // Find user
    let user;
    try {
      user = await db.get(
        'SELECT * FROM users WHERE username = ? AND deleted_at IS NULL',
        [username]
      );
      console.log(`📋 User lookup result:`, user ? `Found user ID ${user.id}` : 'User not found');
    } catch (dbError) {
      console.error('❌ Database error during user lookup:', dbError);
      logger.error('Database error during login:', dbError);
      return res.status(500).json({ success: false, message: 'Database error during login' });
    }

    if (!user) {
      logger.warn(`Login attempt with invalid username: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Handle boolean is_active for PostgreSQL (true/false) vs SQLite (1/0)
    const isActive = user.is_active === true || user.is_active === 1 || user.is_active === '1' || user.is_active === 'true';
    console.log(`✅ User is_active value: ${user.is_active}, interpreted as: ${isActive}`);
    
    if (!isActive) {
      logger.warn(`Login attempt for inactive account: ${username}`);
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    // Verify password
    if (!user.password_hash) {
      logger.error(`User ${username} has no password hash`);
      console.error(`❌ User ${username} has no password hash`);
      return res.status(500).json({ success: false, message: 'Account configuration error' });
    }
    
    console.log(`🔑 Verifying password for user: ${username}`);
    const isValidPassword = await comparePassword(password, user.password_hash);
    console.log(`🔑 Password verification result: ${isValidPassword}`);
    
    if (!isValidPassword) {
      logger.warn(`Login attempt with invalid password for user: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = ? WHERE id = ?',
      [new Date().toISOString(), user.id]
    );

    // Generate token
    const token = generateToken(user);

    // Log audit
    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entity: 'USER',
      entityId: user.id,
      description: `User ${username} logged in`,
      ipAddress: req.ip
    });

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    console.log(`✅ Login successful for user: ${username}, role: ${user.role}`);
    logger.info(`User ${username} logged in successfully`);

    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    logger.error('Login error:', error);
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      username: req.body?.username
    });
    res.status(500).json({ 
      success: false, 
      message: 'Login failed',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
});

// Change password
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user
    const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [newPasswordHash, new Date().toISOString(), userId]
    );

    // Log audit
    await logAudit({
      userId,
      action: 'UPDATE',
      entity: 'USER',
      entityId: userId,
      description: 'Password changed',
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

module.exports = router;

