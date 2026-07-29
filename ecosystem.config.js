module.exports = {
  apps: [
    {
      name: 'safety-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'safety-frontend',
      script: './start-frontend.js',
      instances: 1,
      autorestart: true,
      watch: false
    },
    {
      // Cloudflare tunnel exposing kpi.protecther.in + api.protecther.in.
      // Runs cloudflared via start-tunnel.js (config: ~/.cloudflared/safety-config.yml).
      name: 'safety-tunnel',
      script: './start-tunnel.js',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
