const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');
const { logAudit } = require('../utils/audit');
const logger = require('../utils/logger');

router.use(authenticate);

// Generate unique contract number
async function generateContractNumber() {
  const prefix = 'CNT';
  const year = new Date().getFullYear();
  const count = await db.get('SELECT COUNT(*) as count FROM contracts WHERE contract_number LIKE ?', [`${prefix}-${year}-%`]);
  const sequence = (count.count || 0) + 1;
  return `${prefix}-${year}-${String(sequence).padStart(5, '0')}`;
}

// Get all contracts
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT 
        c.*,
        s.name as vendor_name,
        p.name as project_name,
        u1.full_name as created_by_name,
        u2.full_name as approved_by_name
      FROM contracts c
      LEFT JOIN suppliers s ON c.vendor_id = s.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.approved_by = u2.id
      WHERE c.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.status) {
      sql += ' AND c.status = ?';
      params.push(req.query.status);
    }
    if (req.query.contract_type) {
      sql += ' AND c.contract_type = ?';
      params.push(req.query.contract_type);
    }
    if (req.query.project_id) {
      sql += ' AND c.project_id = ?';
      params.push(req.query.project_id);
    }
    if (req.query.search) {
      sql += ' AND (c.title LIKE ? OR c.contract_number LIKE ?)';
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY c.created_at DESC';
    const contracts = await db.query(sql, params);

    res.json({ success: true, contracts });
  } catch (error) {
    logger.error('Get contracts error:', error);
    res.status(500).json({ success: false, message: 'Failed to get contracts' });
  }
});

// Get single contract with details
router.get('/:id', async (req, res) => {
  try {
    const contract = await db.get(`
      SELECT 
        c.*,
        s.name as vendor_name,
        s.contact_person as vendor_contact,
        s.email as vendor_email,
        s.phone as vendor_phone,
        p.name as project_name,
        u1.full_name as created_by_name,
        u2.full_name as approved_by_name
      FROM contracts c
      LEFT JOIN suppliers s ON c.vendor_id = s.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.approved_by = u2.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `, [req.params.id]);

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    // Get milestones
    const milestones = await db.query(`
      SELECT * FROM contract_milestones
      WHERE contract_id = ?
      ORDER BY due_date ASC
    `, [req.params.id]);

    // Get documents
    const documents = await db.query(`
      SELECT 
        cd.*,
        u.full_name as uploaded_by_name
      FROM contract_documents cd
      LEFT JOIN users u ON cd.uploaded_by = u.id
      WHERE cd.contract_id = ?
      ORDER BY cd.uploaded_at DESC
    `, [req.params.id]);

    res.json({ success: true, contract, milestones, documents });
  } catch (error) {
    logger.error('Get contract error:', error);
    res.status(500).json({ success: false, message: 'Failed to get contract' });
  }
});

// Create contract
router.post('/', authorize('Administrator'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('start_date').notEmpty().withMessage('Start date is required'),
  body('end_date').notEmpty().withMessage('End date is required'),
  body('value').isFloat({ min: 0 }).withMessage('Valid contract value is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const contractNumber = await generateContractNumber();
    const {
      title, contract_type, vendor_id, start_date, end_date, value, currency,
      project_id, description, terms, payment_schedule, auto_renewal,
      renewal_notice_days
    } = req.body;

    const result = await db.query(`
      INSERT INTO contracts (
        contract_number, title, contract_type, vendor_id, start_date, end_date,
        value, currency, project_id, description, terms, payment_schedule,
        auto_renewal, renewal_notice_days, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')
    `, [
      contractNumber, title, contract_type, vendor_id, start_date, end_date,
      value, currency || 'USD', project_id, description, terms, payment_schedule,
      auto_renewal || 0, renewal_notice_days || 90, req.user.id
    ]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'CONTRACT',
      entityId: result.lastID,
      description: `Created contract: ${title} (${contractNumber})`,
      newData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, contractId: result.lastID, contract_number: contractNumber });
  } catch (error) {
    logger.error('Create contract error:', error);
    res.status(500).json({ success: false, message: 'Failed to create contract' });
  }
});

// Update contract
router.put('/:id', authorize('Administrator'), async (req, res) => {
  try {
    const contractId = req.params.id;

    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', [contractId]);
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    // If updating key fields, create new version
    const versioningFields = ['title', 'terms', 'value', 'start_date', 'end_date'];
    const shouldVersion = versioningFields.some(field => req.body[field] !== undefined && contract.status === 'Active');

    const updates = [];
    const params = [];

    const allowedFields = [
      'title', 'contract_type', 'vendor_id', 'start_date', 'end_date', 'value',
      'currency', 'project_id', 'description', 'terms', 'payment_schedule',
      'auto_renewal', 'renewal_notice_days', 'status'
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

    if (shouldVersion) {
      // Create new version
      const newVersion = contract.version + 1;
      updates.push('version = ?');
      params.push(newVersion);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(contractId);

    await db.query(`UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'CONTRACT',
      entityId: contractId,
      description: `Updated contract: ${contract.contract_number}`,
      oldData: contract,
      newData: req.body,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Contract updated successfully' });
  } catch (error) {
    logger.error('Update contract error:', error);
    res.status(500).json({ success: false, message: 'Failed to update contract' });
  }
});

// Approve contract
router.post('/:id/approve', authorize('Administrator'), async (req, res) => {
  try {
    const contractId = req.params.id;

    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', [contractId]);
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    if (contract.status !== 'Draft' && contract.status !== 'Review') {
      return res.status(400).json({ success: false, message: 'Contract cannot be approved in current status' });
    }

    await db.query(`
      UPDATE contracts 
      SET status = 'Approval', approved_by = ?, approved_at = ?, updated_at = ?
      WHERE id = ?
    `, [req.user.id, new Date().toISOString(), new Date().toISOString(), contractId]);

    await logAudit({
      userId: req.user.id,
      action: 'APPROVE',
      entity: 'CONTRACT',
      entityId: contractId,
      description: `Approved contract: ${contract.contract_number}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Contract approved' });
  } catch (error) {
    logger.error('Approve contract error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve contract' });
  }
});

// Add milestone
router.post('/:id/milestones', authorize('Administrator'), [
  body('milestone_name').notEmpty().withMessage('Milestone name is required'),
  body('due_date').notEmpty().withMessage('Due date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const contractId = req.params.id;
    const { milestone_name, due_date, amount, currency, notes } = req.body;

    const contract = await db.get('SELECT id FROM contracts WHERE id = ?', [contractId]);
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    const result = await db.query(`
      INSERT INTO contract_milestones (contract_id, milestone_name, due_date, amount, currency, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [contractId, milestone_name, due_date, amount, currency || 'USD', notes]);

    res.status(201).json({ success: true, milestoneId: result.lastID });
  } catch (error) {
    logger.error('Add milestone error:', error);
    res.status(500).json({ success: false, message: 'Failed to add milestone' });
  }
});

// Update milestone
router.put('/milestones/:id', authorize('Administrator'), async (req, res) => {
  try {
    const milestoneId = req.params.id;
    const { status, completed_date, payment_date, notes } = req.body;

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (completed_date !== undefined) {
      updates.push('completed_date = ?');
      params.push(completed_date);
    }
    if (payment_date !== undefined) {
      updates.push('payment_date = ?');
      params.push(payment_date);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(milestoneId);

    await db.query(`UPDATE contract_milestones SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'Milestone updated successfully' });
  } catch (error) {
    logger.error('Update milestone error:', error);
    res.status(500).json({ success: false, message: 'Failed to update milestone' });
  }
});

// Get contract expiration alerts
router.get('/alerts/expiration', async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 90;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const alerts = await db.query(`
      SELECT 
        c.*,
        s.name as vendor_name,
        p.name as project_name,
        JULIANDAY(c.end_date) - JULIANDAY('now') as days_remaining
      FROM contracts c
      LEFT JOIN suppliers s ON c.vendor_id = s.id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE c.status = 'Active'
        AND c.end_date <= ?
        AND c.end_date >= DATE('now')
        AND c.deleted_at IS NULL
      ORDER BY c.end_date ASC
    `, [targetDate.toISOString().split('T')[0]]);

    res.json({ success: true, alerts });
  } catch (error) {
    logger.error('Get expiration alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to get expiration alerts' });
  }
});

module.exports = router;

