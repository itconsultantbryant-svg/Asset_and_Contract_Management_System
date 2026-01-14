const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');
const { logAudit } = require('../utils/audit');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

router.use(authenticate);

// Generate unique asset ID
async function generateAssetId() {
  const prefix = 'AST';
  const year = new Date().getFullYear();
  const count = await db.get('SELECT COUNT(*) as count FROM assets WHERE asset_id LIKE ?', [`${prefix}-${year}-%`]);
  const sequence = (count.count || 0) + 1;
  return `${prefix}-${year}-${String(sequence).padStart(5, '0')}`;
}

// Get all assets with filters
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT 
        a.*,
        ac.name as category_name,
        ab.name as brand_name,
        ast.name as status_name,
        s.name as supplier_name,
        p.name as project_name,
        l.name as location_name,
        u.full_name as assigned_to_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      LEFT JOIN asset_brands ab ON a.brand_id = ab.id
      LEFT JOIN asset_statuses ast ON a.status_id = ast.id
      LEFT JOIN suppliers s ON a.supplier_id = s.id
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.category_id) {
      sql += ' AND a.category_id = ?';
      params.push(req.query.category_id);
    }
    if (req.query.status_id) {
      sql += ' AND a.status_id = ?';
      params.push(req.query.status_id);
    }
    if (req.query.project_id) {
      sql += ' AND a.project_id = ?';
      params.push(req.query.project_id);
    }
    if (req.query.location_id) {
      sql += ' AND a.location_id = ?';
      params.push(req.query.location_id);
    }
    if (req.query.assigned_to) {
      sql += ' AND a.assigned_to = ?';
      params.push(req.query.assigned_to);
    }
    if (req.query.search) {
      sql += ' AND (a.name LIKE ? OR a.asset_id LIKE ? OR a.serial_number LIKE ?)';
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(req.query.limit) || 50, parseInt(req.query.offset) || 0);

    const assets = await db.query(sql, params);
    res.json({ success: true, assets });
  } catch (error) {
    logger.error('Get assets error:', error);
    res.status(500).json({ success: false, message: 'Failed to get assets' });
  }
});

// Get single asset
router.get('/:id', async (req, res) => {
  try {
    const asset = await db.get(`
      SELECT 
        a.*,
        ac.name as category_name,
        ab.name as brand_name,
        ast.name as status_name,
        s.name as supplier_name,
        p.name as project_name,
        l.name as location_name,
        u.full_name as assigned_to_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      LEFT JOIN asset_brands ab ON a.brand_id = ab.id
      LEFT JOIN asset_statuses ast ON a.status_id = ast.id
      LEFT JOIN suppliers s ON a.supplier_id = s.id
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.id = ? AND a.deleted_at IS NULL
    `, [req.params.id]);

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Get asset history
    const history = await db.query(`
      SELECT 
        ah.*,
        u.full_name as performed_by_name
      FROM asset_history ah
      LEFT JOIN users u ON ah.performed_by = u.id
      WHERE ah.asset_id = ?
      ORDER BY ah.performed_at DESC
    `, [req.params.id]);

    res.json({ success: true, asset, history });
  } catch (error) {
    logger.error('Get asset error:', error);
    res.status(500).json({ success: false, message: 'Failed to get asset' });
  }
});

// Create asset
router.post('/', authorize('Administrator', 'Asset Manager'), [
  body('name').notEmpty().withMessage('Asset name is required'),
  body('category_id').notEmpty().withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = await generateAssetId();
    const {
      name, description, category_id, brand_id, status_id, serial_number, model,
      purchase_date, purchase_price, currency, supplier_id, project_id, location_id,
      assigned_to, warranty_expiry, depreciation_rate, notes
    } = req.body;

    // Generate QR code
    const qrCode = await QRCode.toDataURL(assetId);

    const result = await db.query(`
      INSERT INTO assets (
        asset_id, name, description, category_id, brand_id, status_id, serial_number,
        model, purchase_date, purchase_price, currency, supplier_id, project_id,
        location_id, assigned_to, warranty_expiry, depreciation_rate, current_value,
        qr_code, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assetId, name, description, category_id, brand_id, status_id, serial_number,
      model, purchase_date, purchase_price, currency || 'USD', supplier_id, project_id,
      location_id, assigned_to, warranty_expiry, depreciation_rate, purchase_price,
      qrCode, notes, req.user.id
    ]);

    // Log history
    await db.query(`
      INSERT INTO asset_history (asset_id, action, performed_by)
      VALUES (?, ?, ?)
    `, [result.lastID, 'CREATE', req.user.id]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'ASSET',
      entityId: result.lastID,
      description: `Created asset: ${name} (${assetId})`,
      newData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, assetId: result.lastID, asset_id: assetId });
  } catch (error) {
    logger.error('Create asset error:', error);
    res.status(500).json({ success: false, message: 'Failed to create asset' });
  }
});

// Update asset
router.put('/:id', authorize('Administrator', 'Asset Manager'), async (req, res) => {
  try {
    const assetId = req.params.id;

    // Get existing asset
    const existingAsset = await db.get('SELECT * FROM assets WHERE id = ?', [assetId]);
    if (!existingAsset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const updates = [];
    const params = [];

    const allowedFields = [
      'name', 'description', 'category_id', 'brand_id', 'status_id', 'serial_number',
      'model', 'purchase_date', 'purchase_price', 'currency', 'supplier_id', 'project_id',
      'location_id', 'assigned_to', 'warranty_expiry', 'depreciation_rate', 'notes'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(assetId);

    await db.query(`UPDATE assets SET ${updates.join(', ')} WHERE id = ?`, params);

    // Log history if status or location changed
    if (req.body.status_id || req.body.location_id || req.body.assigned_to) {
      await db.query(`
        INSERT INTO asset_history (
          asset_id, action, from_status_id, to_status_id,
          from_location_id, to_location_id, from_user_id, to_user_id, performed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assetId, 'UPDATE',
        existingAsset.status_id, req.body.status_id || existingAsset.status_id,
        existingAsset.location_id, req.body.location_id || existingAsset.location_id,
        existingAsset.assigned_to, req.body.assigned_to || existingAsset.assigned_to,
        req.user.id
      ]);
    }

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'ASSET',
      entityId: assetId,
      description: `Updated asset: ${existingAsset.asset_id}`,
      oldData: existingAsset,
      newData: req.body,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Asset updated successfully' });
  } catch (error) {
    logger.error('Update asset error:', error);
    res.status(500).json({ success: false, message: 'Failed to update asset' });
  }
});

// Request asset transfer
router.post('/:id/transfer', authorize('Administrator', 'Asset Manager'), [
  body('to_location_id').notEmpty().withMessage('Destination location is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = req.params.id;
    const { to_location_id, to_user_id, reason, notes } = req.body;

    const asset = await db.get('SELECT * FROM assets WHERE id = ?', [assetId]);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const result = await db.query(`
      INSERT INTO asset_transfers (
        asset_id, from_location_id, to_location_id, from_user_id, to_user_id,
        reason, requested_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assetId, asset.location_id, to_location_id, asset.assigned_to, to_user_id,
      reason, req.user.id, notes
    ]);

    await logAudit({
      userId: req.user.id,
      action: 'TRANSFER',
      entity: 'ASSET',
      entityId: assetId,
      description: `Requested transfer of asset ${asset.asset_id}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, transferId: result.lastID });
  } catch (error) {
    logger.error('Transfer asset error:', error);
    res.status(500).json({ success: false, message: 'Failed to request transfer' });
  }
});

// Approve/reject transfer
router.put('/transfers/:id', authorize('Administrator'), [
  body('status').isIn(['Approved', 'Rejected']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transferId = req.params.id;
    const { status } = req.body;

    const transfer = await db.get('SELECT * FROM asset_transfers WHERE id = ?', [transferId]);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    if (transfer.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Transfer already processed' });
    }

    await db.query(`
      UPDATE asset_transfers 
      SET status = ?, approved_by = ?, approved_at = ?
      WHERE id = ?
    `, [status, req.user.id, new Date().toISOString(), transferId]);

    if (status === 'Approved') {
      // Update asset location and assignment
      await db.query(`
        UPDATE assets 
        SET location_id = ?, assigned_to = ?, updated_at = ?
        WHERE id = ?
      `, [transfer.to_location_id, transfer.to_user_id, new Date().toISOString(), transfer.asset_id]);

      // Log history
      await db.query(`
        INSERT INTO asset_history (
          asset_id, action, from_location_id, to_location_id,
          from_user_id, to_user_id, performed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        transfer.asset_id, 'TRANSFER',
        transfer.from_location_id, transfer.to_location_id,
        transfer.from_user_id, transfer.to_user_id,
        req.user.id
      ]);
    }

    await logAudit({
      userId: req.user.id,
      action: status === 'Approved' ? 'APPROVE' : 'REJECT',
      entity: 'ASSET_TRANSFER',
      entityId: transferId,
      description: `${status} transfer request for asset ${transfer.asset_id}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: `Transfer ${status.toLowerCase()}` });
  } catch (error) {
    logger.error('Approve transfer error:', error);
    res.status(500).json({ success: false, message: 'Failed to process transfer' });
  }
});

module.exports = router;

