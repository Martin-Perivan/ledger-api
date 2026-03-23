/**
 * Zod validation schemas for account endpoints.
 * Enforces strict mode to reject unknown fields.
 * @module schemas/account
 */

import { z } from "zod";

const objectIdSchema = z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), {
  message: "Invalid ObjectId format",
});

const createAccountSchema = z
  .object({
    currency: z
      .string()
      .length(3)
      .toUpperCase()
      .refine((val) => /^[A-Z]{3}$/.test(val), {
        message: "Currency must be a valid ISO 4217 code",
      }),
  })
  .strict();

const accountParamsSchema = z.object({
  accountId: objectIdSchema,
});

const accountHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

type CreateAccountInput = z.infer<typeof createAccountSchema>;
type AccountParams = z.infer<typeof accountParamsSchema>;
type AccountHistoryQuery = z.infer<typeof accountHistoryQuerySchema>;

export {
  createAccountSchema,
  accountParamsSchema,
  accountHistoryQuerySchema,
  objectIdSchema,
};
export type { CreateAccountInput, AccountParams, AccountHistoryQuery };
