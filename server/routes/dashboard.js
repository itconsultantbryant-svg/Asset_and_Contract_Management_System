const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../utils/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// Date helpers for SQLite vs PostgreSQL
const isPostgres = process.env.DB_TYPE === 'postgresql';
const SQL_NOW_DATE = isPostgres ? 'CURRENT_DATE' : "DATE('now')";
const SQL_START_OF_MONTH = isPostgres ? "date_trunc('month', CURRENT_DATE)" : "DATE('now', 'start of month')";
const SQL_PLUS_30_DAYS = isPostgres ? "CURRENT_DATE + INTERVAL '30 days'" : "DATE('now', '+30 days')";
const SQL_PLUS_60_DAYS = isPostgres ? "CURRENT_DATE + INTERVAL '60 days'" : "DATE('now', '+60 days')";
const SQL_PLUS_90_DAYS = isPostgres ? "CURRENT_DATE + INTERVAL '90 days'" : "DATE('now', '+90 days')";
const SQL_MINUS_30_DAYS = isPostgres ? "CURRENT_DATE - INTERVAL '30 days'" : "DATE('now', '-30 days')";

// Get dashboard summary - Role-specific comprehensive data
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const summary = {};

    // Administrator - Full access to all data
    if (userRole === 'Administrator') {
      // Total assets
      const totalAssets = await db.get('SELECT COUNT(*) as count FROM assets WHERE deleted_at IS NULL');
      
      // Total asset value
      const totalAssetValue = await db.get(`
        SELECT SUM(purchase_price) as total_value
        FROM assets
        WHERE deleted_at IS NULL
      `);

      // Assets created this month
      const assetsThisMonth = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM assets WHERE deleted_at IS NULL AND created_at >= date_trunc('month', CURRENT_DATE)`
          : `SELECT COUNT(*) as count FROM assets WHERE deleted_at IS NULL AND DATE(created_at) >= DATE('now', 'start of month')`
      );

      // Assets by status
      const assetsByStatus = await db.query(`
        SELECT 
          ast.name as status,
          COUNT(*) as count
        FROM assets a
        LEFT JOIN asset_statuses ast ON a.status_id = ast.id
        WHERE a.deleted_at IS NULL
        GROUP BY ast.name
      `);

      // Assets by category
      const assetsByCategory = await db.query(`
        SELECT 
          ac.name as category,
          COUNT(*) as count
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        WHERE a.deleted_at IS NULL
        GROUP BY ac.name
        ORDER BY count DESC
        LIMIT 10
      `);

      // Assets by project
      const assetsByProject = await db.query(`
        SELECT 
          p.name as project,
          COUNT(*) as count
        FROM assets a
        LEFT JOIN projects p ON a.project_id = p.id
        WHERE a.deleted_at IS NULL
        GROUP BY p.name
        ORDER BY count DESC
        LIMIT 10
      `);

      // Assets by location
      const assetsByLocation = await db.query(`
        SELECT 
          l.name as location,
          COUNT(*) as count
        FROM assets a
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.deleted_at IS NULL
        GROUP BY l.name
        ORDER BY count DESC
        LIMIT 10
      `);

      // Assets assigned to users
      const assetsByUser = await db.query(`
        SELECT 
          u.full_name as user_name,
          COUNT(*) as count
        FROM assets a
        LEFT JOIN users u ON a.assigned_to = u.id
        WHERE a.deleted_at IS NULL AND a.assigned_to IS NOT NULL
        GROUP BY u.full_name
        ORDER BY count DESC
        LIMIT 10
      `);

      // Total stock items
      const totalStockItems = await db.get('SELECT COUNT(*) as count FROM stock_items WHERE deleted_at IS NULL');
      
      // Stock valuation
      const stockValuation = await db.get(`
        SELECT SUM(current_quantity * unit_cost) as total_value
        FROM stock_items
        WHERE deleted_at IS NULL
      `);

      // Stock by category
      const stockByCategory = await db.query(`
        SELECT 
          sc.name as category,
          COUNT(*) as count,
          SUM(si.current_quantity * si.unit_cost) as total_value
        FROM stock_items si
        LEFT JOIN stock_categories sc ON si.category_id = sc.id
        WHERE si.deleted_at IS NULL
        GROUP BY sc.name
        ORDER BY count DESC
        LIMIT 10
      `);

      // Low stock items (quantity < reorder_level)
      const lowStockItems = await db.get(`
        SELECT COUNT(*) as count
        FROM stock_items
        WHERE deleted_at IS NULL 
          AND current_quantity <= reorder_level
          AND reorder_level > 0
      `);

      // Stock movements this month
      const stockMovementsThisMonth = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count, SUM(CASE WHEN movement_type = 'Entry' THEN quantity * unit_cost ELSE 0 END) as entries_value, SUM(CASE WHEN movement_type = 'Exit' THEN quantity * unit_cost ELSE 0 END) as exits_value FROM stock_movements WHERE created_at >= date_trunc('month', CURRENT_DATE)`
          : `SELECT COUNT(*) as count, SUM(CASE WHEN movement_type = 'Entry' THEN quantity * unit_cost ELSE 0 END) as entries_value, SUM(CASE WHEN movement_type = 'Exit' THEN quantity * unit_cost ELSE 0 END) as exits_value FROM stock_movements WHERE DATE(created_at) >= DATE('now', 'start of month')`
      );

      // Active contracts
      const activeContracts = await db.get(`
        SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND deleted_at IS NULL
      `);

      // Contracts by status
      const contractsByStatus = await db.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM contracts
        WHERE deleted_at IS NULL
        GROUP BY status
      `);

      // Contracts expiring soon (90, 60, 30 days)
      const expiring90Days = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= CURRENT_DATE + INTERVAL '90 days' AND end_date >= CURRENT_DATE AND deleted_at IS NULL`
          : `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= DATE('now', '+90 days') AND end_date >= DATE('now') AND deleted_at IS NULL`
      );

      const expiring60Days = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= CURRENT_DATE + INTERVAL '60 days' AND end_date >= CURRENT_DATE AND deleted_at IS NULL`
          : `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= DATE('now', '+60 days') AND end_date >= DATE('now') AND deleted_at IS NULL`
      );

      const expiring30Days = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= CURRENT_DATE + INTERVAL '30 days' AND end_date >= CURRENT_DATE AND deleted_at IS NULL`
          : `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= DATE('now', '+30 days') AND end_date >= DATE('now') AND deleted_at IS NULL`
      );

      // Total contracts value
      const totalContractsValue = await db.get(`
        SELECT SUM(value) as total_value
        FROM contracts
        WHERE deleted_at IS NULL AND status = 'Active'
      `);

      // Contracts created this month
      const contractsThisMonth = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM contracts WHERE deleted_at IS NULL AND created_at >= date_trunc('month', CURRENT_DATE)`
          : `SELECT COUNT(*) as count FROM contracts WHERE deleted_at IS NULL AND DATE(created_at) >= DATE('now', 'start of month')`
      );

      // Pending contract approvals
      const pendingApprovals = await db.get(`
        SELECT COUNT(*) as count
        FROM contracts
        WHERE deleted_at IS NULL AND status IN ('Draft', 'Review', 'Approval')
      `);

      // Total vehicles
      const totalVehicles = await db.get("SELECT COUNT(*) as count FROM vehicles WHERE deleted_at IS NULL AND status = 'Active'");

      // Vehicles by type
      const vehiclesByType = await db.query(`
        SELECT 
          vehicle_type as type,
          COUNT(*) as count
        FROM vehicles
        WHERE deleted_at IS NULL AND status = 'Active'
        GROUP BY vehicle_type
      `);

      // Upcoming maintenance
      const upcomingMaintenance = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM vehicle_maintenance WHERE status IN ('Scheduled', 'In Progress') AND (scheduled_date <= CURRENT_DATE + INTERVAL '30 days' OR next_service_date <= CURRENT_DATE + INTERVAL '30 days')`
          : `SELECT COUNT(*) as count FROM vehicle_maintenance WHERE status IN ('Scheduled', 'In Progress') AND (scheduled_date <= DATE('now', '+30 days') OR next_service_date <= DATE('now', '+30 days'))`
      );

      // Total fuel consumption (last 30 days)
      const fuelConsumption = await db.get(
        isPostgres
          ? `SELECT SUM(quantity) as total_quantity, SUM(total_cost) as total_cost FROM fuel_logs WHERE purchase_date >= CURRENT_DATE - INTERVAL '30 days'`
          : `SELECT SUM(quantity) as total_quantity, SUM(total_cost) as total_cost FROM fuel_logs WHERE purchase_date >= DATE('now', '-30 days')`
      );

      // Total users
      const totalUsers = await db.get(
        `SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND is_active = ${isPostgres ? 'true' : '1'}`
      );

      // Users by role
      const usersByRole = await db.query(`
        SELECT 
          role,
          COUNT(*) as count
        FROM users
        WHERE deleted_at IS NULL AND is_active = ${isPostgres ? 'true' : '1'}
        GROUP BY role
      `);

      summary.assets = {
        total: totalAssets.count,
        totalValue: totalAssetValue.total_value || 0,
        thisMonth: assetsThisMonth.count,
        byStatus: assetsByStatus,
        byCategory: assetsByCategory,
        byProject: assetsByProject,
        byLocation: assetsByLocation,
        byUser: assetsByUser
      };

      summary.stock = {
        totalItems: totalStockItems.count,
        totalValue: stockValuation.total_value || 0,
        byCategory: stockByCategory,
        lowStockCount: lowStockItems.count,
        movementsThisMonth: {
          count: stockMovementsThisMonth.count || 0,
          entriesValue: stockMovementsThisMonth.entries_value || 0,
          exitsValue: stockMovementsThisMonth.exits_value || 0
        }
      };

      summary.contracts = {
        active: activeContracts.count,
        expiring90Days: expiring90Days.count,
        expiring60Days: expiring60Days.count,
        expiring30Days: expiring30Days.count,
        byStatus: contractsByStatus,
        totalValue: totalContractsValue.total_value || 0,
        thisMonth: contractsThisMonth.count,
        pendingApprovals: pendingApprovals.count
      };

      summary.vehicles = {
        total: totalVehicles.count,
        byType: vehiclesByType,
        maintenanceDue: upcomingMaintenance.count,
        fuelConsumption30Days: fuelConsumption.total_quantity || 0,
        fuelCost30Days: fuelConsumption.total_cost || 0
      };

      summary.users = {
        total: totalUsers.count,
        byRole: usersByRole
      };
    }
    // Asset Manager - Assets, Vehicles, Stock (read-only), Contracts (view)
    else if (userRole === 'Asset Manager') {
      // Total assets
      const totalAssets = await db.get('SELECT COUNT(*) as count FROM assets WHERE deleted_at IS NULL');
      
      // Assets by status
      const assetsByStatus = await db.query(`
        SELECT 
          ast.name as status,
          COUNT(*) as count
        FROM assets a
        LEFT JOIN asset_statuses ast ON a.status_id = ast.id
        WHERE a.deleted_at IS NULL
        GROUP BY ast.name
      `);

      // Assets by category
      const assetsByCategory = await db.query(`
        SELECT 
          ac.name as category,
          COUNT(*) as count
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        WHERE a.deleted_at IS NULL
        GROUP BY ac.name
        ORDER BY count DESC
        LIMIT 10
      `);

      // Assets assigned to current user
      const myAssets = await db.get(`
        SELECT COUNT(*) as count 
        FROM assets 
        WHERE deleted_at IS NULL AND assigned_to = ?
      `, [userId]);

      // My assets value
      const myAssetsValue = await db.get(`
        SELECT SUM(purchase_price) as total_value
        FROM assets
        WHERE deleted_at IS NULL AND assigned_to = ?
      `, [userId]);

      // Assets pending transfer approval
      const pendingTransfers = await db.get(`
        SELECT COUNT(*) as count
        FROM asset_transfers
        WHERE status = 'Pending'
      `);

      // Assets created this month
      const assetsThisMonth = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM assets WHERE deleted_at IS NULL AND created_at >= date_trunc('month', CURRENT_DATE)`
          : `SELECT COUNT(*) as count FROM assets WHERE deleted_at IS NULL AND DATE(created_at) >= DATE('now', 'start of month')`
      );

      // Total vehicles
      const totalVehicles = await db.get("SELECT COUNT(*) as count FROM vehicles WHERE deleted_at IS NULL AND status = 'Active'");

      // Upcoming maintenance
      const upcomingMaintenance = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM vehicle_maintenance WHERE status IN ('Scheduled', 'In Progress') AND (scheduled_date <= CURRENT_DATE + INTERVAL '30 days' OR next_service_date <= CURRENT_DATE + INTERVAL '30 days')`
          : `SELECT COUNT(*) as count FROM vehicle_maintenance WHERE status IN ('Scheduled', 'In Progress') AND (scheduled_date <= DATE('now', '+30 days') OR next_service_date <= DATE('now', '+30 days'))`
      );

      // Fuel consumption (last 30 days)
      const fuelConsumption = await db.get(
        isPostgres
          ? `SELECT SUM(quantity) as total_quantity, SUM(total_cost) as total_cost FROM fuel_logs WHERE purchase_date >= CURRENT_DATE - INTERVAL '30 days'`
          : `SELECT SUM(quantity) as total_quantity, SUM(total_cost) as total_cost FROM fuel_logs WHERE purchase_date >= DATE('now', '-30 days')`
      );

      // Stock summary (read-only)
      const totalStockItems = await db.get('SELECT COUNT(*) as count FROM stock_items WHERE deleted_at IS NULL');
      const stockValuation = await db.get(`
        SELECT SUM(current_quantity * unit_cost) as total_value
        FROM stock_items
        WHERE deleted_at IS NULL
      `);

      // Active contracts (view only)
      const activeContracts = await db.get(`
        SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND deleted_at IS NULL
      `);
      const expiringContracts = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= CURRENT_DATE + INTERVAL '90 days' AND end_date >= CURRENT_DATE AND deleted_at IS NULL`
          : `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= DATE('now', '+90 days') AND end_date >= DATE('now') AND deleted_at IS NULL`
      );

      summary.assets = {
        total: totalAssets.count,
        byStatus: assetsByStatus,
        byCategory: assetsByCategory,
        myAssets: myAssets.count,
        myAssetsValue: myAssetsValue.total_value || 0,
        pendingTransfers: pendingTransfers.count,
        thisMonth: assetsThisMonth.count
      };

      summary.vehicles = {
        total: totalVehicles.count,
        maintenanceDue: upcomingMaintenance.count,
        fuelConsumption30Days: fuelConsumption.total_quantity || 0,
        fuelCost30Days: fuelConsumption.total_cost || 0
      };

      summary.stock = {
        totalItems: totalStockItems.count,
        totalValue: stockValuation.total_value || 0
      };

      summary.contracts = {
        active: activeContracts.count,
        expiringSoon: expiringContracts.count
      };
    }
    // Stock Manager - Stock, Assets (view), Contracts (view)
    else if (userRole === 'Stock Manager') {
      // Total stock items
      const totalStockItems = await db.get('SELECT COUNT(*) as count FROM stock_items WHERE deleted_at IS NULL');
      
      // Stock valuation
      const stockValuation = await db.get(`
        SELECT SUM(current_quantity * unit_cost) as total_value
        FROM stock_items
        WHERE deleted_at IS NULL
      `);

      // Stock by category
      const stockByCategory = await db.query(`
        SELECT 
          sc.name as category,
          COUNT(*) as count,
          SUM(si.current_quantity * si.unit_cost) as total_value
        FROM stock_items si
        LEFT JOIN stock_categories sc ON si.category_id = sc.id
        WHERE si.deleted_at IS NULL
        GROUP BY sc.name
        ORDER BY count DESC
        LIMIT 10
      `);

      // Low stock items
      const lowStockItems = await db.get(`
        SELECT COUNT(*) as count
        FROM stock_items
        WHERE deleted_at IS NULL 
          AND current_quantity <= reorder_level
          AND reorder_level > 0
      `);

      // Stock movements (last 30 days)
      const recentMovements = await db.query(
        isPostgres
          ? `SELECT sm.*, si.name as item_name, smr.name as reason_name FROM stock_movements sm LEFT JOIN stock_items si ON sm.stock_item_id = si.id LEFT JOIN stock_movement_reasons smr ON sm.reason_id = smr.id WHERE sm.created_at >= CURRENT_DATE - INTERVAL '30 days' ORDER BY sm.created_at DESC LIMIT 10`
          : `SELECT sm.*, si.name as item_name, smr.name as reason_name FROM stock_movements sm LEFT JOIN stock_items si ON sm.stock_item_id = si.id LEFT JOIN stock_movement_reasons smr ON sm.reason_id = smr.id WHERE sm.created_at >= DATE('now', '-30 days') ORDER BY sm.created_at DESC LIMIT 10`
      );

      // Stock movements this month
      const movementsThisMonth = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count, SUM(CASE WHEN movement_type = 'Entry' THEN quantity * unit_cost ELSE 0 END) as entries_value, SUM(CASE WHEN movement_type = 'Exit' THEN quantity * unit_cost ELSE 0 END) as exits_value FROM stock_movements WHERE created_at >= date_trunc('month', CURRENT_DATE)`
          : `SELECT COUNT(*) as count, SUM(CASE WHEN movement_type = 'Entry' THEN quantity * unit_cost ELSE 0 END) as entries_value, SUM(CASE WHEN movement_type = 'Exit' THEN quantity * unit_cost ELSE 0 END) as exits_value FROM stock_movements WHERE DATE(created_at) >= DATE('now', 'start of month')`
      );

      // Stock entries (last 30 days)
      const recentEntries = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count, SUM(quantity * unit_cost) as total_value FROM stock_movements WHERE movement_type = 'Entry' AND created_at >= CURRENT_DATE - INTERVAL '30 days'`
          : `SELECT COUNT(*) as count, SUM(quantity * unit_cost) as total_value FROM stock_movements WHERE movement_type = 'Entry' AND created_at >= DATE('now', '-30 days')`
      );

      // Stock exits (last 30 days)
      const recentExits = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count, SUM(quantity * unit_cost) as total_value FROM stock_movements WHERE movement_type = 'Exit' AND created_at >= CURRENT_DATE - INTERVAL '30 days'`
          : `SELECT COUNT(*) as count, SUM(quantity * unit_cost) as total_value FROM stock_movements WHERE movement_type = 'Exit' AND created_at >= DATE('now', '-30 days')`
      );

      // Assets summary (view only)
      const totalAssets = await db.get('SELECT COUNT(*) as count FROM assets WHERE deleted_at IS NULL');
      const assetsByStatus = await db.query(`
        SELECT 
          ast.name as status,
          COUNT(*) as count
        FROM assets a
        LEFT JOIN asset_statuses ast ON a.status_id = ast.id
        WHERE a.deleted_at IS NULL
        GROUP BY ast.name
      `);

      // Active contracts (view only)
      const activeContracts = await db.get(`
        SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND deleted_at IS NULL
      `);
      const expiringContracts = await db.get(
        isPostgres
          ? `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= CURRENT_DATE + INTERVAL '90 days' AND end_date >= CURRENT_DATE AND deleted_at IS NULL`
          : `SELECT COUNT(*) as count FROM contracts WHERE status = 'Active' AND end_date <= DATE('now', '+90 days') AND end_date >= DATE('now') AND deleted_at IS NULL`
      );

      summary.stock = {
        totalItems: totalStockItems.count,
        totalValue: stockValuation.total_value || 0,
        byCategory: stockByCategory,
        lowStockCount: lowStockItems.count,
        recentMovements: recentMovements,
        entries30Days: {
          count: recentEntries.count,
          value: recentEntries.total_value || 0
        },
        exits30Days: {
          count: recentExits.count,
          value: recentExits.total_value || 0
        },
        movementsThisMonth: {
          count: movementsThisMonth.count || 0,
          entriesValue: movementsThisMonth.entries_value || 0,
          exitsValue: movementsThisMonth.exits_value || 0
        }
      };

      summary.assets = {
        total: totalAssets.count,
        byStatus: assetsByStatus
      };

      summary.contracts = {
        active: activeContracts.count,
        expiringSoon: expiringContracts.count
      };
    }

    // Recent activities (role-specific - last 20 audit logs)
    const recentActivities = await db.query(`
      SELECT 
        al.*,
        u.username,
        u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 20
    `);

    summary.recentActivities = recentActivities;

    // User-specific notifications count
    const unreadNotifications = await db.get(
      isPostgres
        ? `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`
        : `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    summary.notifications = {
      unread: unreadNotifications.count
    };

    res.json({
      success: true,
      summary,
      userRole
    });
  } catch (error) {
    console.error('❌ Dashboard summary error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userRole: req.user?.role,
      userId: req.user?.id,
      dbType: process.env.DB_TYPE
    });
    logger.error('Get dashboard summary error:', error);
    logger.error('Error stack:', error.stack);
    
    // Always return error message in production for debugging
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard summary',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

module.exports = router;

