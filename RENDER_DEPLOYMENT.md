# Render Deployment Guide
## Asset & Contract Management System (ACMS)

This guide provides step-by-step instructions for deploying the ACMS system to Render.

## Prerequisites

- A GitHub account with the repository pushed
- A Render account (sign up at https://render.com)
- Basic understanding of environment variables

## Deployment Options

### Option 1: Using render.yaml (Recommended)

The project includes a `render.yaml` file that automates the deployment setup.

#### Steps:

1. **Create PostgreSQL Database First** (Required)
   - Go to Render Dashboard → "New +" → "PostgreSQL"
   - Name: `acms-database`
   - Database: `acms`
   - User: `acms_user`
   - Plan: Starter (or higher for production)
   - Region: Choose closest to your users
   - Click "Create Database"
   - **Note the connection details** from the "Connections" tab (you'll need them)

2. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

3. **Connect Repository to Render**
   - Log in to Render Dashboard
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository: `Asset_and_Contract_Management_System`
   - Render will automatically detect `render.yaml`

4. **Review and Deploy**
   - Render will parse `render.yaml` and show you the services to create
   - Review the configuration:
     - **Web Service**: `acms-app` (Node.js service)
   - Click "Apply" to create the web service

5. **Configure Database Environment Variables**
   - After the web service is created, go to its settings → "Environment"
   - Add the database connection variables (from step 1):
     - `DB_HOST` - from your PostgreSQL service
     - `DB_PORT` - from your PostgreSQL service (usually 5432)
     - `DB_NAME` - `acms` (or your database name)
     - `DB_USER` - `acms_user` (or your database user)
     - `DB_PASSWORD` - from your PostgreSQL service
   - The `render.yaml` already configures other variables automatically

6. **Wait for Deployment**
   - Render will build and deploy your application
   - Monitor the build logs for any issues
   - The first deployment may take 5-10 minutes

### Option 2: Manual Setup

If you prefer manual setup or need custom configuration:

#### 1. Create PostgreSQL Database

- Go to Render Dashboard → "New +" → "PostgreSQL"
- Name: `acms-database`
- Database: `acms`
- User: `acms_user`
- Plan: Starter (or higher for production)
- Region: Choose closest to your users
- Click "Create Database"
- **Note the connection details** (you'll need them)

#### 2. Create Web Service

- Go to Render Dashboard → "New +" → "Web Service"
- Connect your GitHub repository
- Configure the service:
  - **Name**: `acms-app`
  - **Environment**: `Node`
  - **Build Command**: `npm run install-all && cd client && npm run build`
  - **Start Command**: `cd server && npm start`
  - **Plan**: Starter (or higher)

#### 3. Configure Environment Variables

In the Web Service settings, add these environment variables:

**Required Variables:**
```
NODE_ENV=production
PORT=10000
DB_TYPE=postgresql
```

**Database Variables** (from your PostgreSQL service):
```
DB_HOST=<from database service>
DB_PORT=<from database service>
DB_NAME=<from database service>
DB_USER=<from database service>
DB_PASSWORD=<from database service>
```

**Security Variables** (generate strong random strings):
```
JWT_SECRET=<generate a strong random string>
SESSION_SECRET=<generate a strong random string>
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
```

**URL Variables** (use your Render service URL):
```
CLIENT_URL=https://acms-app.onrender.com
SERVER_URL=https://acms-app.onrender.com
REACT_APP_API_URL=https://acms-app.onrender.com
```

**Optional Email Configuration:**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@planliberia.org
```

#### 4. Deploy

- Click "Create Web Service"
- Render will build and deploy your application
- Monitor the build logs

## Post-Deployment Steps

### 1. Initialize Database

The database will be automatically initialized on first server start. However, if you need to manually initialize:

1. Go to your Web Service → "Shell"
2. Run:
   ```bash
   cd server
   node scripts/initialize.js
   ```

### 2. Access Your Application

- Your app will be available at: `https://acms-app.onrender.com`
- Default login credentials:
  - Username: `admin`
  - Password: `admin123`
- **⚠️ IMPORTANT**: Change the default password immediately!

### 3. Configure Custom Domain (Optional)

1. Go to your Web Service → "Settings" → "Custom Domains"
2. Add your domain
3. Follow Render's DNS configuration instructions
4. Update `CLIENT_URL` and `SERVER_URL` environment variables

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `10000` |
| `DB_TYPE` | Database type | `postgresql` |
| `DB_HOST` | Database host | `dpg-xxxxx-a.oregon-postgres.render.com` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `acms` |
| `DB_USER` | Database user | `acms_user` |
| `DB_PASSWORD` | Database password | (auto-generated) |

### Security Variables

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `JWT_SECRET` | JWT signing secret | Use `openssl rand -base64 32` |
| `SESSION_SECRET` | Session secret | Use `openssl rand -base64 32` |
| `JWT_EXPIRE` | JWT expiration | `7d` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |

### URL Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CLIENT_URL` | Frontend URL | `https://acms-app.onrender.com` |
| `SERVER_URL` | Backend URL | `https://acms-app.onrender.com` |
| `REACT_APP_API_URL` | API URL for React | `https://acms-app.onrender.com` |

## Troubleshooting

### Build Fails

1. **Check build logs** in Render dashboard
2. **Common issues**:
   - Missing dependencies: Check `package.json` files
   - Build timeout: Increase build timeout in settings
   - Memory issues: Upgrade to a higher plan

### Database Connection Errors

1. **Verify environment variables** are set correctly
2. **Check database status** in Render dashboard
3. **Test connection** using Render Shell:
   ```bash
   psql $DATABASE_URL
   ```

### Application Not Starting

1. **Check logs** in Render dashboard
2. **Verify PORT** is set to `10000` (Render's default)
3. **Check start command** is correct: `cd server && npm start`
4. **Verify all environment variables** are set

### 404 Errors on Frontend Routes

- This should be handled automatically by the server configuration
- If issues persist, verify the React build is in `client/build/`

### CORS Errors

1. **Verify `CLIENT_URL`** matches your actual frontend URL
2. **Check CORS configuration** in `server/index.js`
3. **Ensure `SERVER_URL`** is set correctly

## Render-Specific Considerations

### Free Tier Limitations

- **Spins down after 15 minutes** of inactivity
- **Cold starts** may take 30-60 seconds
- **Limited resources** (512MB RAM, 0.5 CPU)
- **No persistent disk** (use external storage for uploads)

### Production Recommendations

1. **Upgrade to paid plan** for:
   - Always-on service (no spin-down)
   - Better performance
   - More resources
   - Persistent disk

2. **Use external storage** for file uploads:
   - AWS S3
   - Cloudinary
   - Render Disk (paid plans)

3. **Set up monitoring**:
   - Render provides basic monitoring
   - Consider external services (Sentry, LogRocket)

4. **Configure backups**:
   - Render provides automatic PostgreSQL backups
   - Configure backup retention in database settings

## Updating Your Application

### Automatic Deployments

Render automatically deploys when you push to your main branch (if auto-deploy is enabled).

### Manual Deployment

1. Go to your Web Service
2. Click "Manual Deploy" → "Deploy latest commit"

### Rolling Back

1. Go to your Web Service → "Events"
2. Find a previous successful deployment
3. Click "Redeploy"

## Monitoring

### View Logs

- Go to your Web Service → "Logs"
- Real-time logs are available
- Historical logs are retained

### Metrics

- Render provides basic metrics:
  - CPU usage
  - Memory usage
  - Request count
  - Response times

## Security Checklist

- [ ] Changed default admin password
- [ ] Strong JWT_SECRET and SESSION_SECRET
- [ ] HTTPS enabled (automatic on Render)
- [ ] Environment variables secured
- [ ] Database credentials not exposed
- [ ] CORS properly configured
- [ ] Rate limiting enabled

## Support

- **Render Documentation**: https://render.com/docs
- **Render Support**: support@render.com
- **Project Issues**: Check GitHub issues

## Cost Estimation

### Free Tier
- Web Service: Free (with limitations)
- PostgreSQL: Free (90 days, then $7/month)

### Starter Plan
- Web Service: $7/month
- PostgreSQL: $7/month
- **Total**: ~$14/month

### Standard Plan (Recommended for Production)
- Web Service: $25/month
- PostgreSQL: $20/month
- **Total**: ~$45/month

---

**Last Updated**: 2024

