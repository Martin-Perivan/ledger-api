/**
 * Zod validation schemas for authentication endpoints.
 * Enforces strict mode to reject unknown fields.
 * @module schemas/auth
 */

import { z } from "zod";

const registerSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(8).max(128),
    fullName: z.string().min(1).max(200),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(8).max(128),
  })
  .strict();

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

export { registerSchema, loginSchema };
export type { RegisterInput, LoginInput };
