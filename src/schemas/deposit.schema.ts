/**
 * Zod validation schemas for deposit endpoints.
 * Enforces strict mode to reject unknown fields.
 * @module schemas/deposit
 */

import { z } from "zod";

import { objectIdSchema } from "./account.schema.js";

const createDepositSchema = z
  .object({
    accountId: objectIdSchema,
    amount: z.number().int().positive().max(999_999_999),
    currency: z
      .string()
      .length(3)
      .toUpperCase()
      .refine((val) => /^[A-Z]{3}$/.test(val), {
        message: "Currency must be a valid ISO 4217 code",
      }),
    description: z.string().min(1).max(500),
  })
  .strict();

type CreateDepositInput = z.infer<typeof createDepositSchema>;

export { createDepositSchema };
export type { CreateDepositInput };
