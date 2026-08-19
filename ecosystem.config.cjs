module.exports = {
  apps: [
    {
      name: "craft-nordic",
      cwd: "/var/www/www-root/data/www/craft.nordic-builder.ru",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3040 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3040",
      },
    },
  ],
};
