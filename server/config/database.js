const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.db = null;
    this.type = process.env.DB_TYPE || 'sqlite';
    this.connected = false;
  }

  connect() {
    if (this.type === 'sqlite') {
      const dbPath = process.env.DB_PATH || './data/acms.db';
      const dbDir = path.dirname(dbPath);
      
      // Ensure data directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('SQLite connection error:', err);
          throw err;
        }
        logger.info('SQLite database connected');
        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
      });
    } else if (this.type === 'postgresql') {
      // Validate required PostgreSQL environment variables
      if (!process.env.DB_PASSWORD) {
        logger.error('DB_PASSWORD is required for PostgreSQL connection');
        throw new Error('DB_PASSWORD is required for PostgreSQL connection. Please set it in your environment variables.');
      }
      
      if (!process.env.DB_HOST) {
        logger.error('DB_HOST is required for PostgreSQL connection');
        throw new Error('DB_HOST is required for PostgreSQL connection. Please set it in your environment variables.');
      }
      
      this.db = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'acms',
        user: process.env.DB_USER || 'acms_user',
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // Increased timeout for initial connection
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });

      this.db.on('error', (err) => {
        logger.error('PostgreSQL connection error:', err);
        this.connected = false;
      });

      logger.info('PostgreSQL pool created. Connection will be tested on first query.');
      this.connected = true;
    } else {
      throw new Error(`Unsupported database type: ${this.type}`);
    }
  }

  // Helper to convert SQLite placeholders (?) to PostgreSQL placeholders ($1, $2, etc.)
  convertPlaceholders(sql, params) {
    if (this.type !== 'postgresql') {
      return { sql, params };
    }
    
    // Replace ? with $1, $2, $3, etc.
    let paramIndex = 1;
    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    return { sql: convertedSql, params };
  }

  // Helper to modify INSERT queries for PostgreSQL to include RETURNING id
  preparePostgresInsert(sql) {
    if (this.type !== 'postgresql') return sql;
    
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();
    
    // Only modify INSERT statements that don't already have RETURNING
    if (upper.startsWith('INSERT') && !upper.includes('RETURNING')) {
      // Remove trailing semicolon and whitespace, but preserve structure
      let cleanSql = trimmed.replace(/[;\s]*$/, '').trim();
      // Ensure there's a space before RETURNING
      if (!cleanSql.endsWith(')')) {
        // If it doesn't end with ), something is wrong, but try to fix it
        cleanSql = cleanSql.replace(/\s+$/, '');
      }
      // Add RETURNING id at the end
      return `${cleanSql} RETURNING id`;
    }
    
    return sql;
  }

  // Unified query method
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.type === 'sqlite') {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          this.db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        } else {
          this.db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        }
      } else {
        // PostgreSQL - convert placeholders and modify INSERT to include RETURNING id
        const { sql: convertedSql, params: convertedParams } = this.convertPlaceholders(sql, params);
        const modifiedSql = this.preparePostgresInsert(convertedSql);
        
        this.db.query(modifiedSql, convertedParams)
          .then(result => {
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
              resolve(result.rows);
            } else {
              // For INSERT with RETURNING clause, get the ID from rows
              const lastID = result.rows && result.rows.length > 0 && result.rows[0].id 
                ? result.rows[0].id 
                : null;
              resolve({ lastID, changes: result.rowCount });
            }
          })
          .catch(err => {
            console.error('❌ PostgreSQL query error:');
            console.error('  Error:', err.message);
            console.error('  SQL (first 300 chars):', modifiedSql.substring(0, 300));
            console.error('  Params count:', convertedParams.length);
            console.error('  Original SQL (first 200 chars):', sql.substring(0, 200));
            logger.error('PostgreSQL query error:', {
              error: err.message,
              sql: modifiedSql.substring(0, 300),
              originalSql: sql.substring(0, 200),
              paramCount: convertedParams.length,
              params: convertedParams.map((p, i) => ({ index: i, type: typeof p, value: String(p).substring(0, 50) }))
            });
            reject(err);
          });
      }
    });
  }

  // Get single row
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.type === 'sqlite') {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      } else {
        // PostgreSQL - convert placeholders
        const { sql: convertedSql, params: convertedParams } = this.convertPlaceholders(sql, params);
        
        this.db.query(convertedSql, convertedParams)
          .then(result => resolve(result.rows[0] || null))
          .catch(reject);
      }
    });
  }

  // Transaction support
  transaction(callback) {
    return new Promise((resolve, reject) => {
      if (this.type === 'sqlite') {
        this.db.serialize(() => {
          this.db.run('BEGIN TRANSACTION');
          callback(this)
            .then(() => {
              this.db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
              });
            })
            .catch((err) => {
              this.db.run('ROLLBACK', () => {
                reject(err);
              });
            });
        });
      } else {
        this.db.query('BEGIN')
          .then(() => callback(this))
          .then(() => this.db.query('COMMIT'))
          .then(() => resolve())
          .catch((err) => {
            this.db.query('ROLLBACK').then(() => reject(err));
          });
      }
    });
  }

  close() {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      return this.db.end();
    }
  }
}

const db = new Database();
module.exports = db;

