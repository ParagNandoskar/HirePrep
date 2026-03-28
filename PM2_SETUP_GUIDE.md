# PM2 Setup Guide for HirePrep Backend

## Step 1: Install PM2

Run on your **local machine** (for development):
```bash
npm install -g pm2
```

Or add to your **backend package.json** as dev dependency:
```bash
npm install -D pm2
```

---

## Step 2: Start Server Locally with PM2

### Option A: Development Mode (Single Instance)
```bash
pm2 start ecosystem.config.js --name hireprep-backend
```

### Option B: Production Mode (Cluster with Auto-Restart)
```bash
pm2 start ecosystem.config.js --env production
```

### Option C: Watch Files & Auto-Restart
```bash
pm2 start ecosystem.config.js --watch
```

---

## Step 3: Verify PM2 Process

```bash
# List all PM2 processes
pm2 list

# View real-time monitoring
pm2 monit

# View application logs
pm2 logs hireprep-backend

# View specific app logs
pm2 logs hireprep-backend --lines 50

# View both error and output logs
pm2 logs hireprep-backend --err
```

---

## Step 4: Environment Variables

### Local Development
Create `.env` in your backend directory:
```bash
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/hireprep
JWT_SECRET=your_secret_key
REDIS_HOST=localhost
REDIS_PORT=6379
```

PM2 automatically loads from `.env` via `env_file: '.env'` in ecosystem.config.js

### Production (EC2)
```bash
# Copy .env to production server
scp -i your-key.pem .env ec2-user@your-ec2-ip:/srv/hireprep/

# Verify environment variables are loaded
pm2 show hireprep-backend
```

---

## Step 5: Auto-Restart Configuration

Your `ecosystem.config.js` already includes:

| Setting | Value | Purpose |
|---------|-------|---------|
| `max_memory_restart` | 500M | Auto-restart if memory exceeds 500MB |
| `max_restarts` | 10 | Max 10 restart attempts (prevents restart loops) |
| `min_uptime` | 10s | Consider app stable after 10 seconds |
| `autorestart` | true | Always restart crashed processes |
| `kill_timeout` | 5000 | Wait 5 seconds before force-kill |

---

## Step 6: Production EC2 Setup (Systemd)

### One-Time Setup on EC2 Instance

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Run the setup script (make it executable first)
chmod +x setup-pm2.sh
./setup-pm2.sh
```

### What the Script Does:
1. ✅ Installs Node.js 18 (if not present)
2. ✅ Installs PM2 globally
3. ✅ Creates `/srv/hireprep/logs` directory
4. ✅ Configures PM2 to start on system reboot
5. ✅ Installs systemd service file
6. ✅ Enables auto-start on EC2 reboot

---

## Step 7: Deploy to EC2

### Manual Deployment

```bash
# Pull latest code
ssh -i your-key.pem ec2-user@your-ec2-ip
cd /srv/hireprep
git pull origin main

# Install dependencies
npm install

# Copy environment file (if not already there)
# scp -i key.pem .env ec2-user@ip:/srv/hireprep/

# Start PM2
pm2 start ecosystem.config.js --env production
pm2 save

# Check status
pm2 logs hireprep-backend
```

### Automated Deployment (Optional)

```bash
# Use PM2 deploy (requires git repo)
pm2 deploy ecosystem.config.js production setup
pm2 deploy ecosystem.config.js production
```

---

## Step 8: Verify Production Setup

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check if service is running
sudo systemctl status hireprep

# Check PM2 processes
pm2 list

# Monitor CPU/Memory
pm2 monit

# View logs
pm2 logs hireprep-backend

# Check if service starts after reboot
sudo reboot
# Wait 2 minutes, then SSH back and run: sudo systemctl status hireprep
```

---

## Useful PM2 Commands

| Command | Purpose |
|---------|---------|
| `pm2 start ecosystem.config.js` | Start all apps in config |
| `pm2 stop hireprep-backend` | Stop app (doesn't remove) |
| `pm2 restart hireprep-backend` | Restart app (zero-downtime in cluster) |
| `pm2 reload hireprep-backend` | Graceful restart (better for cluster) |
| `pm2 delete hireprep-backend` | Remove app from PM2 |
| `pm2 logs` | View all logs |
| `pm2 monit` | Real-time CPU/Memory monitoring |
| `pm2 save` | Save current state (for recovery) |
| `pm2 resurrect` | Restore saved state |
| `pm2 describe hireprep-backend` | Show app details |
| `pm2 kill` | Kill PM2 daemon and all apps |

---

## Cluster Mode Benefits

Your `ecosystem.config.js` uses `instances: 'max'` and `exec_mode: 'cluster'`:

| Feature | Benefit |
|---------|---------|
| **Max Instances** | Automatically uses all CPU cores (4-core EC2 = 4 instances) |
| **Load Balancing** | PM2 automatically distributes requests |
| **Zero-Downtime Reloads** | Graceful restart without dropping connections |
| **Auto-Restart** | Crash in one instance? Others serve traffic while it restarts |
| **Memory Isolation** | Each instance has independent memory (500M limit) |

---

## Example: 4-Core EC2 Instance

```
[PM2 Load Balancer]
  ↓
  ├── Instance 1 (port 8000) → request 1
  ├── Instance 2 (port 8000) → request 2
  ├── Instance 3 (port 8000) → request 3
  └── Instance 4 (port 8000) → request 4

If Instance 2 crashes:
  ✓ Requests 1, 3, 4 continue
  ✓ Instance 2 auto-restarts
  ✓ After 10s, Instance 2 handles new requests
```

---

## Production Checklist

- [ ] PM2 installed globally on EC2
- [ ] Systemd service file installed (`hireprep.service`)
- [ ] Service enabled for auto-startup: `sudo systemctl enable hireprep`
- [ ] `.env` file deployed to `/srv/hireprep/.env`
- [ ] Logs directory created with proper permissions
- [ ] App starts successfully: `pm2 start ecosystem.config.js --env production`
- [ ] PM2 state saved: `pm2 save`
- [ ] Logs check: `pm2 logs hireprep-backend` (no errors)
- [ ] EC2 rebooted to verify auto-startup works
- [ ] Redis/MongoDB connections verified in logs

---

## Troubleshooting

### App Won't Start
```bash
# Check error logs
pm2 logs hireprep-backend --err

# Check environment variables
pm2 show hireprep-backend

# Verify .env exists
ls -la /srv/hireprep/.env
```

### High Memory Usage
```bash
# Check which instance is consuming memory
pm2 monit

# Increase memory limit in ecosystem.config.js
# Change: max_memory_restart: '500M' to '1G'
```

### Service Won't Auto-Start
```bash
# Check systemd status
sudo systemctl status hireprep

# Check systemd logs
sudo journalctl -u hireprep -n 50

# Restart service manually
sudo systemctl restart hireprep
```

### Need to View Real-Time Logs
```bash
# Follow logs in real-time
pm2 logs hireprep-backend --lines 100 --follow

# Or use systemd
sudo journalctl -u hireprep -f
```

---

## Quick Start Summary

```bash
# Local Development
npm install -g pm2
pm2 start ecosystem.config.js
pm2 logs hireprep-backend

# EC2 Production
ssh ec2-user@your-ip
./setup-pm2.sh
sudo systemctl start hireprep
pm2 logs hireprep-backend
```

---

**You're now ready for production! 🚀**
