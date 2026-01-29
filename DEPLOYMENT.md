# Deployment Guide
## Asset & Contract Management System (ACMS)

This guide provides step-by-step instructions for deploying the ACMS system to a production environment.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (for production) or SQLite (for lightweight deployments)
- PM2 or similar process manager (recommended)
- Nginx or Apache (for reverse proxy)
- SSL certificate (for HTTPS)

## Production Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (if using PostgreSQL)
sudo apt install postgresql postgresql-contrib -y
```

### 2. Database Setup (PostgreSQL)

```bash
# Create database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE acms;
CREATE USER acms_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE acms TO acms_user;
\q
```

### 3. Application Setup

```bash
# Clone or upload the application
cd /var/www
sudo mkdir acms
sudo chown $USER:$USER acms
cd acms

# Copy application files
# (upload your application files here)

# Install dependencies
npm run install-all

# Or separately:
cd server && npm install --production
cd ../client && npm install
```

### 4. Environment Configuration

Create `/var/www/acms/server/.env`:

```env
NODE_ENV=production
PORT=5000
SERVER_URL=https://yourdomain.com

# PostgreSQL Configuration
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=acms
DB_USER=acms_user
DB_PASSWORD=your_secure_password

# JWT Configuration (USE STRONG SECRETS!)
JWT_SECRET=your_very_long_and_random_secret_key_here
JWT_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@example.com

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=another_very_long_and_random_secret_key

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/acms.log
```

**Security Notes:**
- Generate strong random strings for JWT_SECRET and SESSION_SECRET
- Use environment-specific passwords
- Never commit `.env` files to version control

### 5. Build Frontend

```bash
cd /var/www/acms/client
npm run build
```

The build output will be in `client/build/`.

### 6. Process Management with PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > /var/www/acms/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'acms-server',
    script: './server/index.js',
    cwd: '/var/www/acms',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions provided
```

### 7. Nginx Configuration

Create `/etc/nginx/sites-available/acms`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client max body size
    client_max_body_size 10M;

    # Serve React app
    location / {
        root /var/www/acms/client/build;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static uploads
    location /uploads {
        alias /var/www/acms/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/acms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### 9. Database Initialization

```bash
cd /var/www/acms/server
node scripts/initialize.js
```

Or the database will be initialized automatically on first server start.

### 10. Scheduled Tasks (Cron)

Set up daily notification checks:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 9 AM)
0 9 * * * cd /var/www/acms/server && /usr/bin/node scripts/scheduler.js >> /var/www/acms/logs/scheduler.log 2>&1
```

### 11. Backup Strategy

#### Database Backup Script

Create `/var/www/acms/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/acms"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U acms_user acms > $BACKUP_DIR/db_backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

# Upload backup (optional - to S3, etc.)
# aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://your-bucket/backups/
```

Make it executable:

```bash
chmod +x /var/www/acms/scripts/backup.sh
```

Add to crontab (daily at 2 AM):

```bash
0 2 * * * /var/www/acms/scripts/backup.sh
```

## Monitoring & Maintenance

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs acms-server

# Restart application
pm2 restart acms-server

# Stop application
pm2 stop acms-server

# Monitor
pm2 monit
```

### Log Files

- Application logs: `/var/www/acms/server/logs/`
- PM2 logs: `/var/www/acms/logs/`
- Nginx logs: `/var/log/nginx/`

### Health Check

The application provides a health check endpoint:

```bash
curl https://yourdomain.com/api/health
```

## Security Checklist

- [ ] Strong JWT_SECRET and SESSION_SECRET
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Firewall configured
- [ ] Database user has limited privileges
- [ ] Default admin password changed
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Log rotation configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured

## Troubleshooting

### Application won't start

1. Check PM2 logs: `pm2 logs acms-server`
2. Check application logs: `tail -f /var/www/acms/server/logs/combined.log`
3. Verify environment variables
4. Check database connection

### Database connection errors

1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Check database credentials in `.env`
3. Test connection: `psql -U acms_user -d acms`

### Nginx 502 errors

1. Check if Node.js app is running: `pm2 status`
2. Verify proxy_pass URL in Nginx config
3. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## Performance Optimization

1. **Enable Gzip compression** (already in Express)
2. **Use CDN** for static assets (optional)
3. **Database indexing** - Add indexes for frequently queried columns
4. **Caching** - Consider Redis for session storage
5. **Load balancing** - Use multiple PM2 instances (already configured)

## Updates & Upgrades

```bash
# Pull latest code
cd /var/www/acms
git pull  # or upload new files

# Install new dependencies
npm run install-all

# Rebuild frontend
cd client && npm run build

# Restart application
pm2 restart acms-server
```

## Support

For issues or questions, refer to the main README.md or contact the development team.

---

**Last Updated:** 2024

