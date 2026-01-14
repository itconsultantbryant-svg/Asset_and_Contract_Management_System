const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const db = require('./config/database');
const { initializeDatabase } = require('./scripts/initialize');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const assetRoutes = require('./routes/assets');
const stockRoutes = require('./routes/stock');
const vehicleRoutes = require('./routes/vehicles');
const contractRoutes = require('./routes/contracts');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - MUST be before other middleware
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting - more lenient in development
const isDevelopment = process.env.NODE_ENV !== 'production';

// Auth endpoints rate limiter - more lenient for login/auth checks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 200 : 50, // Higher limit in development for auth
  message: 'Too many authentication requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter - more lenient in development, excludes auth routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Higher limit in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/auth') // Skip auth routes (handled separately)
});

// Apply auth limiter to auth routes
app.use('/api/auth', authLimiter);

// Apply general limiter to all other API routes
app.use('/api/', generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const buildPath = path.join(__dirname, '../client/build');
  
  // Serve static files from React build
  app.use(express.static(buildPath));
  
  // Handle React routing - return all requests to React app
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler (only for development, production handled above)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });
}

// Initialize database and start server
async function startServer() {
  try {
    // Ensure required directories exist
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.info('Created uploads directory');
    }
    
    // Log environment info for debugging
    logger.info('Starting server...');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Database type: ${process.env.DB_TYPE || 'sqlite'}`);
    logger.info(`Port: ${PORT}`);
    
    if (process.env.DB_TYPE === 'postgresql') {
      logger.info('PostgreSQL configuration:');
      logger.info(`  DB_HOST: ${process.env.DB_HOST ? '***' : 'NOT SET'}`);
      logger.info(`  DB_PORT: ${process.env.DB_PORT || '5432'}`);
      logger.info(`  DB_NAME: ${process.env.DB_NAME || 'acms'}`);
      logger.info(`  DB_USER: ${process.env.DB_USER || 'acms_user'}`);
      logger.info(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}`);
      
      if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
        logger.error('Missing required database environment variables!');
        logger.error('Please set DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD in your Render environment variables.');
        process.exit(1);
      }
    }
    
    db.connect();
    logger.info('Database connection established');
    
    // Test database connection with a simple query
    try {
      if (process.env.DB_TYPE === 'postgresql') {
        await db.query('SELECT NOW()');
        logger.info('PostgreSQL connection test successful');
      }
    } catch (dbError) {
      logger.error('Database connection test failed:', dbError);
      logger.error('Please check your database configuration and ensure the database is accessible.');
      throw dbError;
    }
    
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Database type: ${process.env.DB_TYPE || 'sqlite'}`);
      logger.info(`Server URL: http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    logger.error('Error message:', error.message);
    if (error.stack) {
      logger.error('Error stack:', error.stack);
    }
    logger.error('Environment check:', {
      dbType: process.env.DB_TYPE,
      hasDbHost: !!process.env.DB_HOST,
      hasDbPort: !!process.env.DB_PORT,
      hasDbName: !!process.env.DB_NAME,
      hasDbUser: !!process.env.DB_USER,
      hasDbPassword: !!process.env.DB_PASSWORD,
      nodeEnv: process.env.NODE_ENV,
      port: PORT
    });
    process.exit(1);
  }
}

startServer();

module.exports = app;

