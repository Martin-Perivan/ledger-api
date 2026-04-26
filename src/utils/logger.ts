/**
 * Structured logging with pino.
 * Configured per environment: pretty in development, JSON in production.
 * pino-pretty is a devDependency — loaded conditionally to avoid prod bloat.
 * @module utils/logger
 */

import pino from "pino";

const isProduction = process.env["NODE_ENV"] === "production";

function createTransportOptions(): pino.TransportSingleOptions | undefined {
  if (isProduction) return undefined;

  try {
    require.resolve("pino-pretty");
    return {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    };
  } catch {
    return undefined;
  }
}

const transport = createTransportOptions();

const logger = pino({
  level: isProduction ? "info" : "debug",
  ...(transport ? { transport } : {}),
  serializers: {
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      "password",
      "passwordHash",
      "accessToken",
      "authorization",
      "req.headers.authorization",
    ],
    censor: "[REDACTED]",
  },
});

export { logger };
