import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "../config/environment.js";
import { globalLimiter } from "./rate-limit.middleware.js";
import { requestIdMiddleware } from "./request-id.middleware.js";
import { responseHeadersMiddleware } from "./response-headers.middleware.js";

function applyAppGatewayMiddleware(app: Express): void {
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(
    helmet({
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.CORS_ORIGIN.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("CORS origin is not allowed"));
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Idempotency-Key",
      ],
    })
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(requestIdMiddleware);
  app.use(responseHeadersMiddleware);
  app.use(globalLimiter);
}

export { applyAppGatewayMiddleware };
