const db = require('../config/database');
const logger = require('../utils/logger');
const { hashPassword } = require('../utils/auth');

// SQL schema definitions
const schemas = {
  sqlite: {
    users: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Administrator', 'Asset Manager', 'Stock Manager')),
        is_active INTEGER DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        deleted_at DATETIME
      )
    `,
    suppliers: `
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    beneficiaries: `
      CREATE TABLE IF NOT EXISTS beneficiaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('Individual', 'Organization', 'Community')),
        contact_info TEXT,
        location TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    asset_categories: `
      CREATE TABLE IF NOT EXISTS asset_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE,
        description TEXT,
        depreciation_rate REAL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    asset_brands: `
      CREATE TABLE IF NOT EXISTS asset_brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    asset_statuses: `
      CREATE TABLE IF NOT EXISTS asset_statuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    projects: `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        donor TEXT,
        start_date DATE,
        end_date DATE,
        budget REAL,
        currency TEXT DEFAULT 'USD',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    locations: `
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('Office', 'Warehouse', 'Field', 'Other')),
        address TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    stock_categories: `
      CREATE TABLE IF NOT EXISTS stock_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE,
        unit TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    stock_movement_reasons: `
      CREATE TABLE IF NOT EXISTS stock_movement_reasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT CHECK(type IN ('Entry', 'Exit')),
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    disposal_reasons: `
      CREATE TABLE IF NOT EXISTS disposal_reasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    exchange_rates: `
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL DEFAULT 'USD',
        rate REAL NOT NULL,
        effective_date DATE NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `,
    assets: `
      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category_id INTEGER,
        brand_id INTEGER,
        status_id INTEGER,
        serial_number TEXT,
        model TEXT,
        purchase_date DATE,
        purchase_price REAL,
        currency TEXT DEFAULT 'USD',
        supplier_id INTEGER,
        project_id INTEGER,
        location_id INTEGER,
        assigned_to INTEGER,
        warranty_expiry DATE,
        depreciation_rate REAL,
        current_value REAL,
        qr_code TEXT,
        barcode TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        deleted_at DATETIME,
        FOREIGN KEY (category_id) REFERENCES asset_categories(id),
        FOREIGN KEY (brand_id) REFERENCES asset_brands(id),
        FOREIGN KEY (status_id) REFERENCES asset_statuses(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `,
    asset_history: `
      CREATE TABLE IF NOT EXISTS asset_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        from_status_id INTEGER,
        to_status_id INTEGER,
        from_location_id INTEGER,
        to_location_id INTEGER,
        from_user_id INTEGER,
        to_user_id INTEGER,
        notes TEXT,
        performed_by INTEGER NOT NULL,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (performed_by) REFERENCES users(id)
      )
    `,
    asset_transfers: `
      CREATE TABLE IF NOT EXISTS asset_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        from_location_id INTEGER,
        to_location_id INTEGER NOT NULL,
        from_user_id INTEGER,
        to_user_id INTEGER,
        reason TEXT,
        status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
        requested_by INTEGER NOT NULL,
        approved_by INTEGER,
        approved_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `,
    asset_maintenance: `
      CREATE TABLE IF NOT EXISTS asset_maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        maintenance_type TEXT CHECK(maintenance_type IN ('Preventive', 'Corrective', 'Emergency')),
        scheduled_date DATE,
        completed_date DATE,
        cost REAL,
        currency TEXT DEFAULT 'USD',
        service_provider TEXT,
        description TEXT,
        next_maintenance_date DATE,
        status TEXT DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
        performed_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (performed_by) REFERENCES users(id)
      )
    `,
    stock_items: `
      CREATE TABLE IF NOT EXISTS stock_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category_id INTEGER,
        unit TEXT NOT NULL,
        reorder_level REAL DEFAULT 0,
        current_quantity REAL DEFAULT 0,
        unit_cost REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        location_id INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (category_id) REFERENCES stock_categories(id),
        FOREIGN KEY (location_id) REFERENCES locations(id)
      )
    `,
    stock_movements: `
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_item_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL CHECK(movement_type IN ('Entry', 'Exit', 'Transfer', 'Adjustment')),
        quantity REAL NOT NULL,
        unit_cost REAL,
        currency TEXT DEFAULT 'USD',
        reason_id INTEGER,
        reference_number TEXT,
        notes TEXT,
        location_id INTEGER,
        project_id INTEGER,
        beneficiary_id INTEGER,
        performed_by INTEGER NOT NULL,
        movement_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stock_item_id) REFERENCES stock_items(id),
        FOREIGN KEY (reason_id) REFERENCES stock_movement_reasons(id),
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
        FOREIGN KEY (performed_by) REFERENCES users(id)
      )
    `,
    vehicles: `
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id TEXT UNIQUE NOT NULL,
        registration_number TEXT UNIQUE NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER,
        color TEXT,
        vehicle_type TEXT CHECK(vehicle_type IN ('Car', 'Truck', 'Motorbike', 'Generator', 'Other')),
        fuel_type TEXT CHECK(fuel_type IN ('Petrol', 'Diesel', 'Electric', 'Hybrid')),
        purchase_date DATE,
        purchase_price REAL,
        currency TEXT DEFAULT 'USD',
        current_mileage REAL DEFAULT 0,
        current_hours REAL DEFAULT 0,
        insurance_expiry DATE,
        license_expiry DATE,
        inspection_expiry DATE,
        status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Maintenance', 'Retired', 'Disposed')),
        location_id INTEGER,
        assigned_to INTEGER,
        project_id INTEGER,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `,
    fuel_logs: `
      CREATE TABLE IF NOT EXISTS fuel_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        fuel_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_cost REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        total_cost REAL NOT NULL,
        odometer_reading REAL,
        hours_reading REAL,
        purchase_date DATE NOT NULL,
        supplier TEXT,
        receipt_number TEXT,
        project_id INTEGER,
        purpose TEXT,
        notes TEXT,
        logged_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (logged_by) REFERENCES users(id)
      )
    `,
    vehicle_maintenance: `
      CREATE TABLE IF NOT EXISTS vehicle_maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        maintenance_type TEXT CHECK(maintenance_type IN ('Service', 'Repair', 'Inspection', 'Insurance', 'License', 'Other')),
        scheduled_date DATE,
        completed_date DATE,
        cost REAL,
        currency TEXT DEFAULT 'USD',
        service_provider TEXT,
        description TEXT,
        next_service_date DATE,
        next_service_mileage REAL,
        status TEXT DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
        performed_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (performed_by) REFERENCES users(id)
      )
    `,
    contracts: `
      CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_number TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        contract_type TEXT CHECK(contract_type IN ('MOU', 'SLA', 'Service', 'Supply', 'Consultancy', 'Other')),
        vendor_id INTEGER,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        value REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'Draft' CHECK(status IN ('Draft', 'Review', 'Approval', 'Execution', 'Active', 'Expired', 'Renewed', 'Terminated')),
        version INTEGER DEFAULT 1,
        parent_contract_id INTEGER,
        project_id INTEGER,
        description TEXT,
        terms TEXT,
        payment_schedule TEXT,
        auto_renewal INTEGER DEFAULT 0,
        renewal_notice_days INTEGER DEFAULT 90,
        created_by INTEGER NOT NULL,
        approved_by INTEGER,
        approved_at DATETIME,
        signed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (vendor_id) REFERENCES suppliers(id),
        FOREIGN KEY (parent_contract_id) REFERENCES contracts(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `,
    contract_milestones: `
      CREATE TABLE IF NOT EXISTS contract_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NOT NULL,
        milestone_name TEXT NOT NULL,
        due_date DATE NOT NULL,
        amount REAL,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Completed', 'Overdue', 'Cancelled')),
        completed_date DATE,
        payment_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id)
      )
    `,
    contract_documents: `
      CREATE TABLE IF NOT EXISTS contract_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NOT NULL,
        document_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        document_type TEXT,
        version INTEGER DEFAULT 1,
        uploaded_by INTEGER NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id),
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `,
    notifications: `
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        is_read INTEGER DEFAULT 0,
        email_sent INTEGER DEFAULT 0,
        email_sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `,
    audit_logs: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id INTEGER,
        description TEXT,
        old_data TEXT,
        new_data TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `
  }
};

// PostgreSQL schema (similar structure with PostgreSQL syntax)
const postgresSchemas = {
  // Convert SQLite schemas to PostgreSQL
  // Main differences: SERIAL instead of AUTOINCREMENT, TIMESTAMP instead of DATETIME
  // Implementation would convert all schemas similarly
};

async function createTables() {
  const dbType = process.env.DB_TYPE || 'sqlite';
  const tables = dbType === 'sqlite' ? schemas.sqlite : postgresSchemas;

  logger.info('Creating database tables...');

  for (const [tableName, schema] of Object.entries(tables)) {
    try {
      await db.query(schema);
      logger.info(`Table ${tableName} created/verified`);
    } catch (error) {
      logger.error(`Error creating table ${tableName}:`, error);
      throw error;
    }
  }
}

async function seedInitialData() {
  logger.info('Seeding initial data...');

  // Check if admin user exists
  const existingAdmin = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
  
  if (!existingAdmin) {
    const adminPassword = await hashPassword('admin123'); // Change in production!
    
    await db.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['admin', 'admin@planliberia.org', adminPassword, 'System Administrator', 'Administrator', 1]);
    
    logger.info('Default admin user created (username: admin, password: admin123)');
  }

  // Seed default asset statuses
  const statuses = [
    { name: 'Active', code: 'ACTIVE' },
    { name: 'In Use', code: 'IN_USE' },
    { name: 'In Maintenance', code: 'MAINTENANCE' },
    { name: 'Retired', code: 'RETIRED' },
    { name: 'Disposed', code: 'DISPOSED' }
  ];

  for (const status of statuses) {
    const existing = await db.get('SELECT id FROM asset_statuses WHERE code = ?', [status.code]);
    if (!existing) {
      await db.query('INSERT INTO asset_statuses (name, code) VALUES (?, ?)', [status.name, status.code]);
    }
  }

  // Seed default stock movement reasons
  const entryReasons = ['Procurement', 'Donation', 'Transfer In', 'Return'];
  const exitReasons = ['Usage', 'Transfer Out', 'Disposal', 'Loss', 'Damage'];

  for (const reason of entryReasons) {
    const existing = await db.get('SELECT id FROM stock_movement_reasons WHERE name = ? AND type = ?', [reason, 'Entry']);
    if (!existing) {
      await db.query('INSERT INTO stock_movement_reasons (name, type) VALUES (?, ?)', [reason, 'Entry']);
    }
  }

  for (const reason of exitReasons) {
    const existing = await db.get('SELECT id FROM stock_movement_reasons WHERE name = ? AND type = ?', [reason, 'Exit']);
    if (!existing) {
      await db.query('INSERT INTO stock_movement_reasons (name, type) VALUES (?, ?)', [reason, 'Exit']);
    }
  }

  logger.info('Initial data seeded');
}

async function initializeDatabase() {
  try {
    await createTables();
    await seedInitialData();
    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };

