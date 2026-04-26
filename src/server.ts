/**
 * Application entry point.
 * Connects to MongoDB, creates the Express app, and starts listening.
 * Implements graceful shutdown with request draining.
 * @module server
 */

import { env } from "./config/environment.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const SHUTDOWN_GRACE_MS = 10_000;

async function main(): Promise<void> {
  const { client, db } = await connectDatabase();
  const app = createApp(db, client);

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      "Ledger API is running"
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down gracefully");

    // Stop accepting new connections
    server.close(async () => {
      logger.info("HTTP server closed, disconnecting database");
      await disconnectDatabase();
      process.exit(0);
    });

    // Force shutdown after grace period if connections haven't drained
    setTimeout(() => {
      logger.warn("Shutdown grace period expired, forcing exit");
      process.exit(1);
    }, SHUTDOWN_GRACE_MS).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
});
