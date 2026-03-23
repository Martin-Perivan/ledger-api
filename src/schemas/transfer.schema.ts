/**
 * Zod validation schemas for transfer endpoints.
 * Enforces strict mode to reject unknown fields.
 * @module schemas/transfer
 */

import { z } from "zod";

import { objectIdSchema } from "./account.schema.js";

const createTransferSchema = z
  .object({
    fromAccountId: objectIdSchema,
    toAccountId: objectIdSchema,
    amount: z.number().int().positive().min(100).max(999_999_999),
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

type CreateTransferInput = z.infer<typeof createTransferSchema>;

export { createTransferSchema };
export type { CreateTransferInput };
