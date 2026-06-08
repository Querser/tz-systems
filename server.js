import "dotenv/config";

const [{ env }, { initializeDatabase }] = await Promise.all([
  import("./server/config/env.js"),
  import("./server/db/migrations.js"),
]);
await initializeDatabase();

const { createApp } = await import("./server/app.js");
const app = createApp();

const server = app.listen(env.port, env.host, () => {
  console.log(`Portfolio server: http://${env.host}:${env.port}`);
});

/** Stops accepting requests cleanly when the process manager replaces the container. */
function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close((error) => {
    process.exit(error ? 1 : 0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
