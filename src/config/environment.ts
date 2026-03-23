/**
 * Typed environment variables with Zod validation.
 * Fails fast at startup if any required variable is missing or invalid.
 * @module config/environment
 */

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  MONGODB_URI: z.string().min(1),
  DATABASE_NAME: z.string().min(1).default("ledger"),

  JWT_SECRET: z.string().min(64),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(3600),

  ANTHROPIC_API_KEY: z.string().min(1).optional().or(z.literal("")),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),
  RISK_ASSESSMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
});

type Environment = z.infer<typeof environmentSchema>;

function loadEnvironment(): Environment {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return result.data;
}

const env: Environment = loadEnvironment();

export { env };
export type { Environment };
