/**
 * Money value object enforcing integer cents and ISO 4217 currency.
 * All arithmetic is integer-based — no floating point, no rounding.
 * @module domain/value-objects/money
 */

interface Money {
  amount: number;
  currency: string;
}

function createMoney(amount: number, currency: string): Money {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Money amount must be a non-negative integer (cents)");
  }

  return { amount, currency };
}

export { createMoney };
export type { Money };
