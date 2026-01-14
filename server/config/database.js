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
      this.db = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'acms',
        user: process.env.DB_USER || 'acms_user',
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.db.on('error', (err) => {
        logger.error('PostgreSQL connection error:', err);
      });

      logger.info('PostgreSQL database connected');
    } else {
      throw new Error(`Unsupported database type: ${this.type}`);
    }
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
        // PostgreSQL
        this.db.query(sql, params)
          .then(result => {
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
              resolve(result.rows);
            } else {
              resolve({ lastID: result.insertId, changes: result.rowCount });
            }
          })
          .catch(reject);
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
        this.db.query(sql, params)
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

