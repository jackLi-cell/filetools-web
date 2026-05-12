module.exports = {
  apps: [
    {
      name: "filetools-api",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1500M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
    {
      name: "filetools-worker",
      script: "dist/workers/process-worker.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "2000M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
    {
      name: "filetools-cleanup",
      script: "dist/workers/cleanup.js",
      cron_restart: "*/30 * * * *",
      autorestart: false,
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/cleanup-error.log",
      out_file: "./logs/cleanup-out.log",
    },
  ],
}
