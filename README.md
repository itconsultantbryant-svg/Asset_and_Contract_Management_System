# Asset & Contract Management System (ACMS)
## Plan International Liberia

A comprehensive web-based system for managing assets, stock, vehicles, fuel, and contracts with full audit trails and donor compliance features.

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18.2.0 (Functional components, Hooks, Context API)
- React Router 6.20.0 (Routing)
- Axios (HTTP client)
- React Query (Data fetching)
- React Hook Form (Form management)
- Recharts (Data visualization)
- jsPDF & ExcelJS (Export functionality)

**Backend:**
- Node.js with Express.js
- JWT Authentication
- SQLite (Development) / PostgreSQL (Production)
- Database abstraction layer for easy switching

**Security:**
- bcryptjs (Password hashing)
- Helmet (Security headers)
- Express Rate Limiting
- CORS protection
- Input validation with express-validator

## 📁 Project Structure

```
Assets_and_Contract_Management_System/
├── server/                 # Backend application
│   ├── config/            # Configuration files
│   │   └── database.js   # Database abstraction layer
│   ├── routes/            # API routes
│   │   ├── auth.js       # Authentication routes
│   │   ├── admin.js      # Administration routes
│   │   ├── assets.js     # Asset management routes
│   │   ├── stock.js      # Stock management routes
│   │   ├── vehicles.js   # Vehicle & fuel routes
│   │   ├── contracts.js  # Contract management routes
│   │   ├── dashboard.js  # Dashboard data routes
│   │   ├── reports.js    # Reporting routes
│   │   └── notifications.js # Notification routes
│   ├── scripts/          # Utility scripts
│   │   ├── initialize.js # Database initialization
│   │   └── scheduler.js  # Scheduled tasks
│   ├── utils/            # Utility functions
│   │   ├── auth.js       # Authentication utilities
│   │   ├── audit.js      # Audit logging
│   │   ├── logger.js     # Winston logger
│   │   └── notifications.js # Notification engine
│   └── index.js          # Server entry point
├── client/               # Frontend React application
│   ├── public/           # Static files
│   └── src/
│       ├── components/   # Reusable components
│       ├── contexts/     # React contexts (Auth)
│       ├── pages/        # Page components
│       ├── App.js        # Main app component
│       └── index.js     # Entry point
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SQLite (for development) or PostgreSQL (for production)

### Installation

1. **Clone the repository** (or navigate to the project directory)

2. **Install dependencies:**

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Configure environment variables:**

Create a `.env` file in the `server` directory:

```env
NODE_ENV=development
PORT=5000
SERVER_URL=http://localhost:5000

# Database (SQLite for development)
DB_TYPE=sqlite
DB_PATH=./data/acms.db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d

# Email Configuration (optional, for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@planliberia.org

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_change_in_production
```

4. **Initialize the database:**

The database will be automatically initialized when you start the server for the first time.

5. **Start the development servers:**

```bash
# From root directory
npm run dev

# Or start separately:
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

6. **Access the application:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Default Login Credentials

- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Important:** Change the default password immediately in production!

## 📊 System Modules

### 1. Administration Module
- User management (CRUD, role assignment)
- Master data management:
  - Suppliers & beneficiaries
  - Asset categories, brands, statuses
  - Projects & donors
  - Locations
  - Stock categories & movement reasons
  - Disposal reasons
  - Currency exchange rates

**Access:** Administrator only

### 2. Asset Management Module
- Asset creation with auto-generated unique IDs
- QR code / Barcode support
- Asset assignment to staff, projects, locations
- Asset transfers with approval workflow
- Maintenance scheduling
- Depreciation tracking
- Disposal workflow
- Comprehensive reporting

**Access:** Administrator, Asset Manager

### 3. Stock Management Module
- Stock item management
- Stock entry (procurement, donations)
- Stock exit (usage, transfer, disposal)
- Replenishment tracking
- Stock valuation
- Movement history
- Reports by item, category, reason

**Access:** Administrator, Stock Manager

### 4. Fuel & Vehicle Maintenance Module
- Vehicle & equipment registry
- Fuel purchase & consumption logs
- Link fuel usage to vehicles, motorbikes, generators
- Mileage & runtime tracking
- Maintenance & servicing history
- Insurance, inspection & license renewals
- Automated alerts for maintenance due and insurance expiry
- Fuel efficiency & consumption reports
- Project-based usage tracking

**Access:** Administrator, Asset Manager

### 5. Contract Management Module
- Centralized contract repository
- Version control
- Contract lifecycle stages (Draft, Review, Approval, Execution, Active, Expired, Renewed)
- Automated email alerts (90/60/30 days before expiration)
- Payment milestones tracking
- Penalties & incentives
- Vendor performance analysis
- Audit trails
- Reports & analytics

**Access:** All authenticated users (with role-based restrictions)

## 🔐 Security Features

- **Authentication:** JWT-based secure login
- **Authorization:** Role-based access control (RBAC)
- **Password Security:** bcrypt hashing with configurable rounds
- **Audit Logging:** Complete activity tracking
- **Input Validation:** Server-side validation on all endpoints
- **Rate Limiting:** Protection against brute force attacks
- **Security Headers:** Helmet.js for secure HTTP headers
- **Soft Deletes:** Data retention for audit purposes

## 📝 User Roles

1. **Administrator / IT**
   - Full system access
   - User management
   - Master data configuration
   - All CRUD operations

2. **Asset Manager**
   - Asset management
   - Vehicle management
   - Stock management (read-only)
   - Contract viewing

3. **Stock Manager**
   - Stock management
   - Asset viewing
   - Contract viewing

## 🔔 Notifications

The system includes a notification engine that sends alerts for:

- Contract expiration (90, 60, 30 days before)
- Asset warranty expiration
- Maintenance due dates
- Unauthorized asset movements

Notifications are stored in the database and can be sent via email (if configured).

### Setting up Email Notifications

1. Configure email settings in `.env`
2. For Gmail, use an App Password (not your regular password)
3. The notification scheduler runs checks automatically

## 📈 Reporting

The system provides comprehensive reporting with export capabilities:

- **Asset Reports:** By user, category, donor, project, location
- **Stock Reports:** Valuation, movement history
- **Contract Reports:** Status, expiration, milestones
- **Export Formats:** PDF, Excel (XLSX)

## 🗄️ Database

### Development (SQLite)
- Database file: `server/data/acms.db`
- Automatically created on first run
- No additional setup required

### Production (PostgreSQL)
Update `.env` with PostgreSQL credentials:

```env
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=acms
DB_USER=acms_user
DB_PASSWORD=your_password
```

The database abstraction layer handles the differences automatically.

## 🧪 Testing

```bash
# Run server tests
cd server
npm test
```

## 📦 Deployment

### Production Build

```bash
# Build frontend
cd client
npm run build

# The build folder contains the production-ready React app
# Serve it with a static file server or integrate with Express
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure PostgreSQL database
4. Set up email notifications
5. Configure proper CORS origins
6. Set up SSL/HTTPS
7. Configure backup strategy

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Asset Endpoints

- `GET /api/assets` - List assets (with filters)
- `GET /api/assets/:id` - Get asset details
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `POST /api/assets/:id/transfer` - Request transfer
- `PUT /api/assets/transfers/:id` - Approve/reject transfer

### Stock Endpoints

- `GET /api/stock/items` - List stock items
- `POST /api/stock/items` - Create stock item
- `POST /api/stock/entry` - Record stock entry
- `POST /api/stock/exit` - Record stock exit
- `GET /api/stock/valuation` - Get stock valuation

### Contract Endpoints

- `GET /api/contracts` - List contracts
- `GET /api/contracts/:id` - Get contract details
- `POST /api/contracts` - Create contract
- `PUT /api/contracts/:id` - Update contract
- `POST /api/contracts/:id/approve` - Approve contract
- `GET /api/contracts/alerts/expiration` - Get expiration alerts

### Dashboard Endpoints

- `GET /api/dashboard/summary` - Get dashboard summary

### Reports Endpoints

- `GET /api/reports/assets?format=excel|pdf` - Asset report
- `GET /api/reports/stock?format=excel` - Stock report
- `GET /api/reports/contracts?format=excel` - Contract report

## 🔧 Maintenance

### Database Backup

For SQLite:
```bash
cp server/data/acms.db server/data/acms.db.backup
```

For PostgreSQL:
```bash
pg_dump -U acms_user acms > backup.sql
```

### Scheduled Tasks

Set up a cron job to run notification checks:

```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/project/server && node scripts/scheduler.js
```

## 📄 License

This system is developed for Plan International Liberia.

## 👥 Support

For technical support or questions, please contact the development team.

## 🎯 Future Enhancements

- Mobile app integration
- Barcode scanner support
- Advanced analytics dashboard
- Multi-currency support with automatic conversion
- Document management system
- Workflow automation
- Integration with accounting systems

---

**Version:** 1.0.0  
**Last Updated:** 2024

# Asset_and_Contract_Management_System
