module.exports = {
  apps: [
    {
      name: "fact-atlas",
      cwd: "/root/fact-atlas",
      script: "server.mjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "768M",
      restart_delay: 2_000,
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "3013",
      },
    },
  ],
};
