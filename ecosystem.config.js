module.exports = {
  apps: [
    {
      name: 'arrum-zada-api',
      script: 'index.js',
      instances: 'max', // Cluster mode: memanfaatkan seluruh core CPU server VPS
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
