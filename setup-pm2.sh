#!/bin/bash

# PM2 Setup Script for Production EC2 Deployment
# Run this once on your EC2 instance to configure PM2 for auto-startup

set -e

echo "======================================"
echo "HirePrep PM2 Production Setup"
echo "======================================"

# 1. Install Node.js if not present
echo "✓ Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

NODE_VERSION=$(node --version)
echo "✓ Node.js version: $NODE_VERSION"

# 2. Install PM2 globally
echo "✓ Installing PM2 globally..."
sudo npm install -g pm2

# 3. Create logs directory
echo "✓ Creating logs directory..."
mkdir -p /srv/hireprep/logs
chmod 755 /srv/hireprep/logs

# 4. Test PM2 startup
echo "✓ Setting up PM2 startup script..."
sudo pm2 startup systemd -u ec2-user --hp /home/ec2-user

# 5. Copy service file
echo "✓ Installing systemd service file..."
sudo cp hireprep.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hireprep.service

# 6. Save PM2 configuration
echo "✓ Saving PM2 configuration..."
pm2 save

echo ""
echo "======================================"
echo "✅ PM2 Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Deploy your code to /srv/hireprep"
echo "2. Copy .env file to /srv/hireprep/"
echo "3. Run: pm2 start ecosystem.config.js --env production"
echo "4. Run: pm2 save"
echo "5. Start service: sudo systemctl start hireprep"
echo ""
echo "Useful commands:"
echo "  pm2 list                          # See all running apps"
echo "  pm2 monit                         # Monitor in real-time"
echo "  pm2 logs hireprep-backend         # View logs"
echo "  pm2 stop hireprep-backend         # Stop app"
echo "  pm2 restart hireprep-backend      # Restart app"
echo "  sudo systemctl status hireprep    # Check service status"
echo ""
