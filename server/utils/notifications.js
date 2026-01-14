const db = require('../config/database');
const nodemailer = require('nodemailer');
const logger = require('./logger');

// Email transporter configuration
let transporter = null;

function initializeEmailTransporter() {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    logger.info('Email transporter initialized');
  } else {
    logger.warn('Email configuration not found. Email notifications will be disabled.');
  }
}

// Initialize on module load
initializeEmailTransporter();

/**
 * Create a notification
 */
async function createNotification({
  userId,
  type,
  title,
  message,
  entityType = null,
  entityId = null
}) {
  try {
    const result = await db.query(`
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, type, title, message, entityType, entityId]);

    return result.lastID;
  } catch (error) {
    logger.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(userId, subject, message) {
  if (!transporter) {
    logger.warn('Email transporter not configured. Skipping email send.');
    return false;
  }

  try {
    const user = await db.get('SELECT email, full_name FROM users WHERE id = ?', [userId]);
    if (!user || !user.email) {
      logger.warn(`User ${userId} has no email address`);
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">${subject}</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${message}
          </div>
          <p style="color: #7f8c8d; font-size: 12px;">
            This is an automated notification from ACMS - Plan International Liberia
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    // Update notification record
    await db.query(`
      UPDATE notifications 
      SET email_sent = 1, email_sent_at = ?
      WHERE user_id = ? AND title = ? AND email_sent = 0
      ORDER BY created_at DESC LIMIT 1
    `, [new Date().toISOString(), userId, subject]);

    logger.info(`Email sent to ${user.email}: ${subject}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Check and send contract expiration alerts
 */
async function checkContractExpirations() {
  try {
    const contracts = await db.query(`
      SELECT 
        c.*,
        s.name as vendor_name,
        u.email,
        u.id as user_id
      FROM contracts c
      LEFT JOIN suppliers s ON c.vendor_id = s.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.status = 'Active'
        AND c.deleted_at IS NULL
        AND (
          (JULIANDAY(c.end_date) - JULIANDAY('now') = 90)
          OR (JULIANDAY(c.end_date) - JULIANDAY('now') = 60)
          OR (JULIANDAY(c.end_date) - JULIANDAY('now') = 30)
        )
    `);

    for (const contract of contracts) {
      const daysRemaining = Math.ceil((new Date(contract.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      const title = `Contract Expiring Soon: ${contract.contract_number}`;
      const message = `
        <p>Contract <strong>${contract.contract_number}</strong> - ${contract.title}</p>
        <p>Vendor: ${contract.vendor_name || 'N/A'}</p>
        <p>Expires in <strong>${daysRemaining} days</strong> (${contract.end_date})</p>
        <p>Please review and take necessary action.</p>
      `;

      // Create notification
      await createNotification({
        userId: contract.user_id,
        type: 'CONTRACT_EXPIRATION',
        title,
        message,
        entityType: 'CONTRACT',
        entityId: contract.id
      });

      // Send email
      await sendEmailNotification(contract.user_id, title, message);
    }

    logger.info(`Checked ${contracts.length} contracts for expiration alerts`);
  } catch (error) {
    logger.error('Error checking contract expirations:', error);
  }
}

/**
 * Check and send asset warranty expiration alerts
 */
async function checkAssetWarrantyExpirations() {
  try {
    const assets = await db.query(`
      SELECT 
        a.*,
        u.email,
        u.id as user_id
      FROM assets a
      LEFT JOIN users u ON a.assigned_to = u.id OR a.created_by = u.id
      WHERE a.warranty_expiry IS NOT NULL
        AND a.deleted_at IS NULL
        AND (
          (JULIANDAY(a.warranty_expiry) - JULIANDAY('now') = 90)
          OR (JULIANDAY(a.warranty_expiry) - JULIANDAY('now') = 30)
        )
    `);

    for (const asset of assets) {
      const daysRemaining = Math.ceil((new Date(asset.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24));
      
      const title = `Asset Warranty Expiring: ${asset.asset_id}`;
      const message = `
        <p>Asset <strong>${asset.asset_id}</strong> - ${asset.name}</p>
        <p>Warranty expires in <strong>${daysRemaining} days</strong> (${asset.warranty_expiry})</p>
        <p>Please review maintenance and warranty terms.</p>
      `;

      if (asset.user_id) {
        await createNotification({
          userId: asset.user_id,
          type: 'ASSET_WARRANTY',
          title,
          message,
          entityType: 'ASSET',
          entityId: asset.id
        });

        await sendEmailNotification(asset.user_id, title, message);
      }
    }

    logger.info(`Checked ${assets.length} assets for warranty expiration alerts`);
  } catch (error) {
    logger.error('Error checking asset warranty expirations:', error);
  }
}

/**
 * Check and send maintenance due alerts
 */
async function checkMaintenanceDue() {
  try {
    const maintenance = await db.query(`
      SELECT 
        vm.*,
        v.registration_number,
        v.make,
        v.model,
        u.email,
        u.id as user_id
      FROM vehicle_maintenance vm
      JOIN vehicles v ON vm.vehicle_id = v.id
      LEFT JOIN users u ON v.assigned_to = u.id
      WHERE vm.status IN ('Scheduled', 'In Progress')
        AND (
          (vm.scheduled_date <= DATE('now', '+7 days') AND vm.scheduled_date >= DATE('now'))
          OR (vm.next_service_date <= DATE('now', '+7 days') AND vm.next_service_date >= DATE('now'))
        )
        AND v.deleted_at IS NULL
    `);

    for (const maint of maintenance) {
      const title = `Maintenance Due: ${maint.registration_number}`;
      const message = `
        <p>Vehicle <strong>${maint.registration_number}</strong> - ${maint.make} ${maint.model}</p>
        <p>Maintenance Type: ${maint.maintenance_type}</p>
        <p>Scheduled Date: ${maint.scheduled_date || maint.next_service_date}</p>
        <p>Please schedule service appointment.</p>
      `;

      if (maint.user_id) {
        await createNotification({
          userId: maint.user_id,
          type: 'MAINTENANCE_DUE',
          title,
          message,
          entityType: 'VEHICLE_MAINTENANCE',
          entityId: maint.id
        });

        await sendEmailNotification(maint.user_id, title, message);
      }
    }

    logger.info(`Checked ${maintenance.length} maintenance records for due alerts`);
  } catch (error) {
    logger.error('Error checking maintenance due:', error);
  }
}

/**
 * Get user notifications
 */
async function getUserNotifications(userId, limit = 50) {
  try {
    const notifications = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, limit]);

    return notifications;
  } catch (error) {
    logger.error('Failed to get user notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
  try {
    await db.query(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);

    return true;
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  sendEmailNotification,
  checkContractExpirations,
  checkAssetWarrantyExpirations,
  checkMaintenanceDue,
  getUserNotifications,
  markAsRead
};

