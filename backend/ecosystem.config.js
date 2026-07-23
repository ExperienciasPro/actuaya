/**
 * PM2 Ecosystem Config — ActuaYa Backend
 *
 * Two-Tier Architecture: This runs ONLY on the Backend Server.
 * The frontend is served by Nginx on a separate server.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'api.actuaya.co',
      script: 'server.js',
      cwd: '/var/www/api.actuaya.co',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '3005',
      },
      // Logging
      error_file: '/var/log/pm2/actuaya-backend-error.log',
      out_file: '/var/log/pm2/actuaya-backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful restart
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
