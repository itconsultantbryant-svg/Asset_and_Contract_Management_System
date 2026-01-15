const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');
const { logAudit } = require('../utils/audit');
const logger = require('../utils/logger');

router.use(authenticate);

// Generate unique vehicle ID
async function generateVehicleId() {
  const prefix = 'PIL';
  const year = new Date().getFullYear();
  const count = await db.get('SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id LIKE ?', [`${prefix}-VEH-${year}-%`]);
  const sequence = (count.count || 0) + 1;
  return `${prefix}-VEH-${year}-${String(sequence).padStart(5, '0')}`;
}

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT 
        v.*,
        l.name as location_name,
        u.full_name as assigned_to_name,
        p.name as project_name
      FROM vehicles v
      LEFT JOIN locations l ON v.location_id = l.id
      LEFT JOIN users u ON v.assigned_to = u.id
      LEFT JOIN projects p ON v.project_id = p.id
      WHERE v.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.vehicle_type) {
      sql += ' AND v.vehicle_type = ?';
      params.push(req.query.vehicle_type);
    }
    if (req.query.status) {
      sql += ' AND v.status = ?';
      params.push(req.query.status);
    }
    if (req.query.project_id) {
      sql += ' AND v.project_id = ?';
      params.push(req.query.project_id);
    }

    sql += ' ORDER BY v.created_at DESC';
    const vehicles = await db.query(sql, params);

    res.json({ success: true, vehicles });
  } catch (error) {
    logger.error('Get vehicles error:', error);
    res.status(500).json({ success: false, message: 'Failed to get vehicles' });
  }
});

// Get single vehicle with details
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await db.get(`
      SELECT 
        v.*,
        l.name as location_name,
        u.full_name as assigned_to_name,
        p.name as project_name
      FROM vehicles v
      LEFT JOIN locations l ON v.location_id = l.id
      LEFT JOIN users u ON v.assigned_to = u.id
      LEFT JOIN projects p ON v.project_id = p.id
      WHERE v.id = ? AND v.deleted_at IS NULL
    `, [req.params.id]);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Get fuel logs
    const fuelLogs = await db.query(`
      SELECT 
        fl.*,
        p.name as project_name,
        u.full_name as logged_by_name
      FROM fuel_logs fl
      LEFT JOIN projects p ON fl.project_id = p.id
      LEFT JOIN users u ON fl.logged_by = u.id
      WHERE fl.vehicle_id = ?
      ORDER BY fl.purchase_date DESC, fl.created_at DESC
    `, [req.params.id]);

    // Get maintenance records
    const maintenance = await db.query(`
      SELECT 
        vm.*,
        u.full_name as performed_by_name
      FROM vehicle_maintenance vm
      LEFT JOIN users u ON vm.performed_by = u.id
      WHERE vm.vehicle_id = ?
      ORDER BY vm.scheduled_date DESC, vm.created_at DESC
    `, [req.params.id]);

    res.json({ success: true, vehicle, fuelLogs, maintenance });
  } catch (error) {
    logger.error('Get vehicle error:', error);
    res.status(500).json({ success: false, message: 'Failed to get vehicle' });
  }
});

// Create vehicle
router.post('/', authorize('Administrator', 'Asset Manager'), [
  body('registration_number').notEmpty().withMessage('Registration number is required'),
  body('make').notEmpty().withMessage('Make is required'),
  body('model').notEmpty().withMessage('Model is required'),
  body('vehicle_type').isIn(['Car', 'Truck', 'Motorbike', 'Generator', 'Other']).withMessage('Invalid vehicle type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const vehicleId = await generateVehicleId();
    const {
      registration_number, make, model, year, color, vehicle_type, fuel_type,
      purchase_date, purchase_price, currency, location_id, assigned_to, project_id, notes
    } = req.body;

    // Check if registration number exists
    const existing = await db.get('SELECT id FROM vehicles WHERE registration_number = ?', [registration_number]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Registration number already exists' });
    }

    const result = await db.query(`
      INSERT INTO vehicles (
        vehicle_id, registration_number, make, model, year, color, vehicle_type,
        fuel_type, purchase_date, purchase_price, currency, location_id,
        assigned_to, project_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vehicleId, registration_number, make, model, year, color, vehicle_type,
      fuel_type, purchase_date, purchase_price, currency || 'USD', location_id,
      assigned_to, project_id, notes
    ]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'VEHICLE',
      entityId: result.lastID,
      description: `Created vehicle: ${make} ${model} (${registration_number})`,
      newData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, vehicleId: result.lastID, vehicle_id: vehicleId });
  } catch (error) {
    logger.error('Create vehicle error:', error);
    res.status(500).json({ success: false, message: 'Failed to create vehicle' });
  }
});

// Log fuel purchase
router.post('/:id/fuel', authorize('Administrator', 'Asset Manager'), [
  body('quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('unit_cost').isFloat({ min: 0 }).withMessage('Valid unit cost is required'),
  body('purchase_date').notEmpty().withMessage('Purchase date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const vehicleId = req.params.id;
    const {
      fuel_type, quantity, unit_cost, currency, odometer_reading, hours_reading,
      purchase_date, supplier, receipt_number, project_id, purpose, notes
    } = req.body;

    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const total_cost = parseFloat(quantity) * parseFloat(unit_cost);

    const result = await db.query(`
      INSERT INTO fuel_logs (
        vehicle_id, fuel_type, quantity, unit_cost, currency, total_cost,
        odometer_reading, hours_reading, purchase_date, supplier, receipt_number,
        project_id, purpose, notes, logged_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vehicleId, fuel_type || vehicle.fuel_type, quantity, unit_cost, currency || 'USD', total_cost,
      odometer_reading, hours_reading, purchase_date, supplier, receipt_number,
      project_id, purpose, notes, req.user.id
    ]);

    // Update vehicle mileage/hours if provided
    if (odometer_reading) {
      await db.query(
        'UPDATE vehicles SET current_mileage = ?, updated_at = ? WHERE id = ?',
        [odometer_reading, new Date().toISOString(), vehicleId]
      );
    }
    if (hours_reading) {
      await db.query(
        'UPDATE vehicles SET current_hours = ?, updated_at = ? WHERE id = ?',
        [hours_reading, new Date().toISOString(), vehicleId]
      );
    }

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'FUEL_LOG',
      entityId: result.lastID,
      description: `Fuel purchase logged: ${quantity}L for ${vehicle.registration_number}`,
      newData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, fuelLogId: result.lastID });
  } catch (error) {
    logger.error('Log fuel error:', error);
    res.status(500).json({ success: false, message: 'Failed to log fuel purchase' });
  }
});

// Schedule maintenance
router.post('/:id/maintenance', authorize('Administrator', 'Asset Manager'), [
  body('maintenance_type').isIn(['Service', 'Repair', 'Inspection', 'Insurance', 'License', 'Other']).withMessage('Invalid maintenance type'),
  body('scheduled_date').notEmpty().withMessage('Scheduled date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const vehicleId = req.params.id;
    const {
      maintenance_type, scheduled_date, description, cost, currency,
      service_provider, next_service_date, next_service_mileage
    } = req.body;

    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const result = await db.query(`
      INSERT INTO vehicle_maintenance (
        vehicle_id, maintenance_type, scheduled_date, description, cost, currency,
        service_provider, next_service_date, next_service_mileage, performed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vehicleId, maintenance_type, scheduled_date, description, cost, currency || 'USD',
      service_provider, next_service_date, next_service_mileage, req.user.id
    ]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'VEHICLE_MAINTENANCE',
      entityId: result.lastID,
      description: `Scheduled ${maintenance_type} for ${vehicle.registration_number}`,
      newData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, maintenanceId: result.lastID });
  } catch (error) {
    logger.error('Schedule maintenance error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule maintenance' });
  }
});

// Update maintenance status
router.put('/maintenance/:id', authorize('Administrator', 'Asset Manager'), async (req, res) => {
  try {
    const maintenanceId = req.params.id;
    const { status, completed_date, cost, description, next_service_date, next_service_mileage } = req.body;

    const maintenance = await db.get('SELECT * FROM vehicle_maintenance WHERE id = ?', [maintenanceId]);
    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

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
    if (cost !== undefined) {
      updates.push('cost = ?');
      params.push(cost);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (next_service_date !== undefined) {
      updates.push('next_service_date = ?');
      params.push(next_service_date);
    }
    if (next_service_mileage !== undefined) {
      updates.push('next_service_mileage = ?');
      params.push(next_service_mileage);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(maintenanceId);

    await db.query(`UPDATE vehicle_maintenance SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'Maintenance updated successfully' });
  } catch (error) {
    logger.error('Update maintenance error:', error);
    res.status(500).json({ success: false, message: 'Failed to update maintenance' });
  }
});

// Get maintenance alerts
router.get('/maintenance/alerts', async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const alerts = await db.query(`
      SELECT 
        vm.*,
        v.registration_number,
        v.make,
        v.model,
        v.current_mileage,
        v.current_hours
      FROM vehicle_maintenance vm
      JOIN vehicles v ON vm.vehicle_id = v.id
      WHERE vm.status IN ('Scheduled', 'In Progress')
        AND (
          (vm.scheduled_date <= ? AND vm.scheduled_date >= DATE('now'))
          OR (vm.next_service_date <= ? AND vm.next_service_date >= DATE('now'))
        )
        AND v.deleted_at IS NULL
      ORDER BY vm.scheduled_date ASC, vm.next_service_date ASC
    `, [targetDate.toISOString().split('T')[0], targetDate.toISOString().split('T')[0]]);

    res.json({ success: true, alerts });
  } catch (error) {
    logger.error('Get maintenance alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to get maintenance alerts' });
  }
});

module.exports = router;

