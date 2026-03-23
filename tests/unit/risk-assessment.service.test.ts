/**
 * Tests for the risk assessment service — validates fallback rules
 * and response validation logic.
 * @module tests/unit/risk-assessment.service
 */

import { applyFallbackRules, type RiskContext } from "../../src/services/risk-assessment.service.js";

function createContext(overrides: Partial<RiskContext> = {}): RiskContext {
  return {
    amount: 5000,
    currency: "MXN",
    description: "Test transfer",
    fromAccountId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    toAccountId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    senderBalance: 100000,
    senderAccountCreatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    senderTotalTransactions: 10,
    senderAverageAmount: 5000,
    senderTransfersLastHour: 1,
    previousTransfersToRecipient: 3,
    ...overrides,
  };
}

describe("Fallback Rules", () => {
  it("should return LOW risk for a normal transaction", () => {
    const context = createContext();
    const result = applyFallbackRules(context);

    expect(result.riskScore).toBeLessThanOrEqual(40);
    expect(result.riskLevel).toBe("LOW");
    expect(result.flags).toHaveLength(0);
    expect(result.reasoning).toContain("fallback");
  });

  it("should flag large_transfer for amounts over 500,000 cents", () => {
    const context = createContext({ amount: 600_000, senderBalance: 1_000_000 });
    const result = applyFallbackRules(context);

    expect(result.flags).toContain("large_transfer");
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
  });

  it("should flag velocity_spike for more than 5 transfers per hour", () => {
    const context = createContext({ senderTransfersLastHour: 8 });
    const result = applyFallbackRules(context);

    expect(result.flags).toContain("velocity_spike");
    expect(result.riskScore).toBeGreaterThanOrEqual(35);
  });

  it("should flag balance_drain for amounts over 80% of balance", () => {
    const context = createContext({ amount: 90000, senderBalance: 100000 });
    const result = applyFallbackRules(context);

    expect(result.flags).toContain("balance_drain");
  });

  it("should flag new_account for accounts less than 24 hours old", () => {
    const context = createContext({
      senderAccountCreatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    });
    const result = applyFallbackRules(context);

    expect(result.flags).toContain("new_account");
    expect(result.riskScore).toBeGreaterThanOrEqual(25);
  });

  it("should return HIGH risk when multiple flags trigger", () => {
    const context = createContext({
      amount: 600_000,
      senderBalance: 700_000,
      senderTransfersLastHour: 8,
      senderAccountCreatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    });

    const result = applyFallbackRules(context);

    expect(result.riskLevel).toBe("HIGH");
    expect(result.riskScore).toBeGreaterThanOrEqual(71);
    expect(result.flags.length).toBeGreaterThanOrEqual(3);
  });

  it("should cap risk score at 100", () => {
    const context = createContext({
      amount: 600_000,
      senderBalance: 650_000,
      senderTransfersLastHour: 10,
      senderAccountCreatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    });

    const result = applyFallbackRules(context);

    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("should classify MEDIUM risk correctly (score 41-70)", () => {
    const context = createContext({
      amount: 600_000,
      senderBalance: 700_000,
    });

    const result = applyFallbackRules(context);

    expect(result.riskScore).toBeGreaterThanOrEqual(41);
    expect(result.riskScore).toBeLessThanOrEqual(70);
    expect(result.riskLevel).toBe("MEDIUM");
  });
});
