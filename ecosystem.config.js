module.exports = {
  apps: [
    {
      name: 'hireprep-backend',

      // ✅ FIX: run inside backend folder
      script: 'server.js',
      cwd: './backend',

      // Cluster mode
      instances: 2, // you can use "max" later
      exec_mode: 'cluster',

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 8000,
      },

      // Auto-restart
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 5,
      autorestart: true,

      // Logs (store inside backend/logs)
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Watch disabled (good)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'temp'],

      // Graceful shutdown
      kill_timeout: 5000,

      // Load env file
      env_file: '.env',
    },
  ],

  // (No change needed here — keep as it is)
  deploy: {
    production: {
      user: 'ec2-user',
      host: 'your-ec2-instance-ip',
      key: '~/.ssh/your-key.pem',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/HirePrep.git',
      path: '/srv/hireprep',
      'pre-deploy': 'echo "Deploying to Production"',
      'post-deploy':
        'npm install && npm run build && pm2 start ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Pre-deploy checks running..."',
    },

    staging: {
      user: 'ec2-user',
      host: 'your-staging-ip',
      key: '~/.ssh/your-key.pem',
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/HirePrep.git',
      path: '/srv/hireprep-staging',
      'post-deploy': 'npm install && pm2 start ecosystem.config.js',
    },
  },
};