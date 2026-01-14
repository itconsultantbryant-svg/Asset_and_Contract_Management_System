const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');
const { hashPassword } = require('../utils/auth');
const { logAudit } = require('../utils/audit');
const logger = require('../utils/logger');

// All admin routes require authentication
router.use(authenticate);

// User management routes require Administrator role
router.use('/users', authorize('Administrator'));

// Master data GET routes are accessible to all authenticated users
// But POST/PUT/DELETE operations require Administrator role

// ========== USER MANAGEMENT ==========

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await db.query(`
      SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    res.json({ success: true, users });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
});

// Create user
router.post('/users', [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('role').isIn(['Administrator', 'Asset Manager', 'Stock Manager']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password, full_name, role } = req.body;

    // Check if username exists
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    // Check if email exists
    const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const passwordHash = await hashPassword(password);

    const result = await db.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, email, passwordHash, full_name, role, req.user.id]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'USER',
      entityId: result.lastID,
      description: `Created user: ${username}`,
      newData: { username, email, role },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: 'User created successfully', userId: result.lastID });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['Administrator', 'Asset Manager', 'Stock Manager']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.params.id;
    const { email, full_name, role, is_active } = req.body;

    // Get existing user
    const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(full_name);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(userId);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'USER',
      entityId: userId,
      description: `Updated user: ${existingUser.username}`,
      oldData: existingUser,
      newData: req.body,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// Delete user (soft delete)
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await db.query(
      'UPDATE users SET deleted_at = ? WHERE id = ?',
      [new Date().toISOString(), userId]
    );

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'USER',
      entityId: userId,
      description: `Deleted user: ${user.username}`,
      oldData: user,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// ========== SUPPLIERS ==========

router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await db.query(`
      SELECT * FROM suppliers WHERE deleted_at IS NULL ORDER BY name
    `);
    res.json({ success: true, suppliers });
  } catch (error) {
    logger.error('Get suppliers error:', error);
    res.status(500).json({ success: false, message: 'Failed to get suppliers' });
  }
});

router.post('/suppliers', authorize('Administrator'), [
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, contact_person, email, phone, address } = req.body;
    const result = await db.query(`
      INSERT INTO suppliers (name, contact_person, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `, [name, contact_person, email, phone, address]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'SUPPLIER',
      entityId: result.lastID,
      description: `Created supplier: ${name}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, supplierId: result.lastID });
  } catch (error) {
    logger.error('Create supplier error:', error);
    res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
});

// ========== ASSET CATEGORIES ==========

router.get('/asset-categories', async (req, res) => {
  try {
    const categories = await db.query(`
      SELECT * FROM asset_categories WHERE deleted_at IS NULL ORDER BY name
    `);
    res.json({ success: true, categories });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to get categories' });
  }
});

router.post('/asset-categories', authorize('Administrator'), [
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, code, description, depreciation_rate } = req.body;
    const result = await db.query(`
      INSERT INTO asset_categories (name, code, description, depreciation_rate)
      VALUES (?, ?, ?, ?)
    `, [name, code, description, depreciation_rate || 0]);

    res.status(201).json({ success: true, categoryId: result.lastID });
  } catch (error) {
    logger.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

// ========== PROJECTS ==========

router.get('/projects', async (req, res) => {
  try {
    const projects = await db.query(`
      SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY name
    `);
    res.json({ success: true, projects });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({ success: false, message: 'Failed to get projects' });
  }
});

router.post('/projects', authorize('Administrator'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('start_date').notEmpty().withMessage('Start date is required'),
  body('end_date').notEmpty().withMessage('End date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, code, donor, start_date, end_date, budget, currency } = req.body;
    const result = await db.query(`
      INSERT INTO projects (name, code, donor, start_date, end_date, budget, currency)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, code, donor, start_date, end_date, budget, currency || 'USD']);

    res.status(201).json({ success: true, projectId: result.lastID });
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Failed to create project' });
  }
});

// ========== LOCATIONS ==========

router.get('/locations', async (req, res) => {
  try {
    const locations = await db.query(`
      SELECT * FROM locations WHERE deleted_at IS NULL ORDER BY name
    `);
    res.json({ success: true, locations });
  } catch (error) {
    logger.error('Get locations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get locations' });
  }
});

router.post('/locations', authorize('Administrator'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['Office', 'Warehouse', 'Field', 'Other']).withMessage('Invalid location type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, type, address } = req.body;
    const result = await db.query(`
      INSERT INTO locations (name, type, address)
      VALUES (?, ?, ?)
    `, [name, type, address]);

    res.status(201).json({ success: true, locationId: result.lastID });
  } catch (error) {
    logger.error('Create location error:', error);
    res.status(500).json({ success: false, message: 'Failed to create location' });
  }
});

module.exports = router;

