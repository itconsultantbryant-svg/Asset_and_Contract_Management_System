# Quick Start Guide
## Asset & Contract Management System (ACMS)

Get up and running in 5 minutes!

## Prerequisites

- Node.js v14+ installed
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
# From project root
npm run install-all
```

This installs dependencies for root, server, and client.

### 2. Configure Environment

Create `server/.env` file:

```env
NODE_ENV=development
PORT=5000
DB_TYPE=sqlite
DB_PATH=./data/acms.db
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRE=7d
```

### 3. Start Development Servers

```bash
# From project root
npm run dev
```

This starts both:
- Backend server on http://localhost:5000
- Frontend React app on http://localhost:3000

### 4. Access the Application

1. Open browser: http://localhost:3000
2. Login with default credentials:
   - **Username:** `admin`
   - **Password:** `admin123`

### 5. First Steps

1. **Change the default password** (Settings → Change Password)
2. **Create master data:**
   - Go to Administration → Master Data
   - Add suppliers, categories, locations, projects
3. **Start using the system:**
   - Create assets
   - Record stock movements
   - Add vehicles
   - Create contracts

## What's Included

✅ Complete backend API with authentication  
✅ React frontend with routing  
✅ Database schema with auto-initialization  
✅ Role-based access control  
✅ Audit logging  
✅ Notification system  
✅ Reporting with PDF/Excel export  

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Customize the system for your needs

## Troubleshooting

**Port already in use?**
- Change PORT in `server/.env`
- Or kill the process using the port

**Database errors?**
- Ensure `server/data/` directory exists
- Check file permissions

**Module not found errors?**
- Run `npm install` in the specific directory (server or client)
- Delete `node_modules` and reinstall

## Support

Refer to the main README.md for detailed information.

---

Happy managing! 🚀

