/**
 * Structured logging with pino.
 * Configured per environment: pretty in development, JSON in production.
 * @module utils/logger
 */

import pino from "pino";

const isProduction = process.env["NODE_ENV"] === "production";

const logger = pino({
  level: isProduction ? "info" : "debug",
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }),
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
