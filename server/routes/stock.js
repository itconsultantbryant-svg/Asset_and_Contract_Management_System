const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');
const { logAudit } = require('../utils/audit');
const logger = require('../utils/logger');

router.use(authenticate);

// Get all stock items
router.get('/items', async (req, res) => {
  try {
    let sql = `
      SELECT 
        si.*,
        sc.name as category_name,
        l.name as location_name
      FROM stock_items si
      LEFT JOIN stock_categories sc ON si.category_id = sc.id
      LEFT JOIN locations l ON si.location_id = l.id
      WHERE si.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.category_id) {
      sql += ' AND si.category_id = ?';
      params.push(req.query.category_id);
    }
    if (req.query.location_id) {
      sql += ' AND si.location_id = ?';
      params.push(req.query.location_id);
    }
    if (req.query.search) {
      sql += ' AND (si.name LIKE ? OR si.description LIKE ?)';
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY si.name';
    const items = await db.query(sql, params);

    res.json({ success: true, items });
  } catch (error) {
    logger.error('Get stock items error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stock items' });
  }
});

// Get stock item with movements
router.get('/items/:id', async (req, res) => {
  try {
    const item = await db.get(`
      SELECT 
        si.*,
        sc.name as category_name,
        l.name as location_name
      FROM stock_items si
      LEFT JOIN stock_categories sc ON si.category_id = sc.id
      LEFT JOIN locations l ON si.location_id = l.id
      WHERE si.id = ? AND si.deleted_at IS NULL
    `, [req.params.id]);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Stock item not found' });
    }

    // Get movement history
    const movements = await db.query(`
      SELECT 
        sm.*,
        smr.name as reason_name,
        p.name as project_name,
        b.name as beneficiary_name,
        u.full_name as performed_by_name
      FROM stock_movements sm
      LEFT JOIN stock_movement_reasons smr ON sm.reason_id = smr.id
      LEFT JOIN projects p ON sm.project_id = p.id
      LEFT JOIN beneficiaries b ON sm.beneficiary_id = b.id
      LEFT JOIN users u ON sm.performed_by = u.id
      WHERE sm.stock_item_id = ?
      ORDER BY sm.movement_date DESC, sm.created_at DESC
    `, [req.params.id]);

    res.json({ success: true, item, movements });
  } catch (error) {
    logger.error('Get stock item error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stock item' });
  }
});

// Create stock item
router.post('/items', authorize('Administrator', 'Stock Manager'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('unit').notEmpty().withMessage('Unit is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, category_id, unit, reorder_level, unit_cost, currency, location_id } = req.body;

    const result = await db.query(`
      INSERT INTO stock_items (name, description, category_id, unit, reorder_level, unit_cost, currency, location_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, description, category_id, unit, reorder_level || 0, unit_cost || 0, currency || 'USD', location_id]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'STOCK_ITEM',
      entityId: result.lastID,
      description: `Created stock item: ${name}`,
      newData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, itemId: result.lastID });
  } catch (error) {
    logger.error('Create stock item error:', error);
    res.status(500).json({ success: false, message: 'Failed to create stock item' });
  }
});

// Stock entry
router.post('/entry', authorize('Administrator', 'Stock Manager'), [
  body('stock_item_id').notEmpty().withMessage('Stock item is required'),
  body('quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('movement_date').notEmpty().withMessage('Movement date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      stock_item_id, quantity, unit_cost, currency, reason_id,
      reference_number, notes, location_id, project_id
    } = req.body;

    // Get stock item
    const item = await db.get('SELECT * FROM stock_items WHERE id = ?', [stock_item_id]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Stock item not found' });
    }

    // Create movement record
    const result = await db.query(`
      INSERT INTO stock_movements (
        stock_item_id, movement_type, quantity, unit_cost, currency,
        reason_id, reference_number, notes, location_id, project_id,
        performed_by, movement_date
      ) VALUES (?, 'Entry', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      stock_item_id, quantity, unit_cost || item.unit_cost, currency || 'USD',
      reason_id, reference_number, notes, location_id || item.location_id, project_id,
      req.user.id, req.body.movement_date
    ]);

    // Update stock quantity
    const newQuantity = (item.current_quantity || 0) + parseFloat(quantity);
    await db.query(
      'UPDATE stock_items SET current_quantity = ?, updated_at = ? WHERE id = ?',
      [newQuantity, new Date().toISOString(), stock_item_id]
    );

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'STOCK_MOVEMENT',
      entityId: result.lastID,
      description: `Stock entry: ${quantity} ${item.unit} of ${item.name}`,
      newData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, movementId: result.lastID });
  } catch (error) {
    logger.error('Stock entry error:', error);
    res.status(500).json({ success: false, message: 'Failed to record stock entry' });
  }
});

// Stock exit
router.post('/exit', authorize('Administrator', 'Stock Manager'), [
  body('stock_item_id').notEmpty().withMessage('Stock item is required'),
  body('quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('movement_date').notEmpty().withMessage('Movement date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      stock_item_id, quantity, reason_id, reference_number, notes,
      location_id, project_id, beneficiary_id
    } = req.body;

    // Get stock item
    const item = await db.get('SELECT * FROM stock_items WHERE id = ?', [stock_item_id]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Stock item not found' });
    }

    // Check available quantity
    if (parseFloat(quantity) > (item.current_quantity || 0)) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock. Available: ${item.current_quantity || 0} ${item.unit}` 
      });
    }

    // Create movement record
    const result = await db.query(`
      INSERT INTO stock_movements (
        stock_item_id, movement_type, quantity, unit_cost, currency,
        reason_id, reference_number, notes, location_id, project_id,
        beneficiary_id, performed_by, movement_date
      ) VALUES (?, 'Exit', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      stock_item_id, quantity, item.unit_cost, item.currency,
      reason_id, reference_number, notes, location_id, project_id,
      beneficiary_id, req.user.id, req.body.movement_date
    ]);

    // Update stock quantity
    const newQuantity = (item.current_quantity || 0) - parseFloat(quantity);
    await db.query(
      'UPDATE stock_items SET current_quantity = ?, updated_at = ? WHERE id = ?',
      [newQuantity, new Date().toISOString(), stock_item_id]
    );

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'STOCK_MOVEMENT',
      entityId: result.lastID,
      description: `Stock exit: ${quantity} ${item.unit} of ${item.name}`,
      newData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, movementId: result.lastID });
  } catch (error) {
    logger.error('Stock exit error:', error);
    res.status(500).json({ success: false, message: 'Failed to record stock exit' });
  }
});

// Get stock movements
router.get('/movements', async (req, res) => {
  try {
    let sql = `
      SELECT 
        sm.*,
        si.name as item_name,
        si.unit as item_unit,
        smr.name as reason_name,
        p.name as project_name,
        u.full_name as performed_by_name
      FROM stock_movements sm
      LEFT JOIN stock_items si ON sm.stock_item_id = si.id
      LEFT JOIN stock_movement_reasons smr ON sm.reason_id = smr.id
      LEFT JOIN projects p ON sm.project_id = p.id
      LEFT JOIN users u ON sm.performed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.query.stock_item_id) {
      sql += ' AND sm.stock_item_id = ?';
      params.push(req.query.stock_item_id);
    }
    if (req.query.movement_type) {
      sql += ' AND sm.movement_type = ?';
      params.push(req.query.movement_type);
    }
    if (req.query.start_date) {
      sql += ' AND sm.movement_date >= ?';
      params.push(req.query.start_date);
    }
    if (req.query.end_date) {
      sql += ' AND sm.movement_date <= ?';
      params.push(req.query.end_date);
    }

    sql += ' ORDER BY sm.movement_date DESC, sm.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(req.query.limit) || 100, parseInt(req.query.offset) || 0);

    const movements = await db.query(sql, params);
    res.json({ success: true, movements });
  } catch (error) {
    logger.error('Get movements error:', error);
    res.status(500).json({ success: false, message: 'Failed to get movements' });
  }
});

// Get stock valuation
router.get('/valuation', async (req, res) => {
  try {
    const items = await db.query(`
      SELECT 
        si.*,
        sc.name as category_name,
        (si.current_quantity * si.unit_cost) as total_value
      FROM stock_items si
      LEFT JOIN stock_categories sc ON si.category_id = sc.id
      WHERE si.deleted_at IS NULL AND si.current_quantity > 0
      ORDER BY total_value DESC
    `);

    const totalValue = items.reduce((sum, item) => sum + (item.total_value || 0), 0);

    res.json({ 
      success: true, 
      items, 
      summary: {
        totalItems: items.length,
        totalValue,
        currency: 'USD'
      }
    });
  } catch (error) {
    logger.error('Get valuation error:', error);
    res.status(500).json({ success: false, message: 'Failed to get valuation' });
  }
});

module.exports = router;

