const db = require('../config/database');
const logger = require('./logger');

/**
 * Log an audit event
 * @param {Object} params - Audit parameters
 * @param {number} params.userId - User ID performing the action
 * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, TRANSFER, APPROVE, etc.)
 * @param {string} params.entity - Entity type (ASSET, STOCK, CONTRACT, USER, etc.)
 * @param {number} params.entityId - ID of the affected entity
 * @param {string} params.description - Human-readable description
 * @param {Object} params.oldData - Previous state (for updates)
 * @param {Object} params.newData - New state
 * @param {string} params.ipAddress - Client IP address
 */
async function logAudit({
  userId,
  action,
  entity,
  entityId,
  description,
  oldData = null,
  newData = null,
  ipAddress = null
}) {
  try {
    const sql = `
      INSERT INTO audit_logs (
        user_id, action, entity, entity_id, description, 
        old_data, new_data, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      userId,
      action,
      entity,
      entityId,
      description,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      ipAddress,
      new Date().toISOString()
    ]);

    logger.info(`Audit log: ${action} on ${entity} (ID: ${entityId}) by user ${userId}`);
  } catch (error) {
    logger.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Get audit logs with filters
 */
async function getAuditLogs(filters = {}) {
  try {
    let sql = `
      SELECT 
        al.*,
        u.username,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.userId) {
      sql += ' AND al.user_id = ?';
      params.push(filters.userId);
    }

    if (filters.entity) {
      sql += ' AND al.entity = ?';
      params.push(filters.entity);
    }

    if (filters.action) {
      sql += ' AND al.action = ?';
      params.push(filters.action);
    }

    if (filters.startDate) {
      sql += ' AND al.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND al.created_at <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(filters.limit || 100, filters.offset || 0);

    return await db.query(sql, params);
  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    throw error;
  }
}

module.exports = {
  logAudit,
  getAuditLogs
};

