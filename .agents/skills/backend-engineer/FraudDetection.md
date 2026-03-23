# Fraud Detection — Risk Assessment Skill

## Overview

The `RiskAssessmentService` evaluates every P2P transfer in real time using the Anthropic Claude API. It receives transaction context, sends a structured prompt, and returns a risk score that determines whether the transfer proceeds or is blocked.

## Integration Point

```
TransferService.execute()
  ├── 1. Validate accounts
  ├── 2. Check sufficient balance
  ├── 3. riskService.assess(context)  ← THIS SERVICE
  │       ├── Build prompt with transaction context
  │       ├── Call Claude API (3s timeout)
  │       ├── Parse JSON response
  │       └── Return RiskAssessment or fallback
  ├── 4. If HIGH → block, return 403
  ├── 5. If LOW/MEDIUM → execute ledger write
  └── 6. Log risk result in transaction + audit
```

## Claude API Call Specification

### Model
```
claude-sonnet-4-20250514
```

### Request Structure

```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(context) }],
  }),
});
```

### System Prompt

```
You are a fintech fraud detection engine. You analyze transaction data and return a risk assessment as a JSON object. You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no preamble.

The JSON object must have exactly these fields:
- "riskScore": integer from 0 to 100 (0 = no risk, 100 = certain fraud)
- "riskLevel": exactly one of "LOW", "MEDIUM", or "HIGH"
- "flags": array of strings identifying specific risk indicators (empty array if none)
- "reasoning": a brief one-sentence explanation of the assessment

Risk level thresholds:
- LOW: riskScore 0-40
- MEDIUM: riskScore 41-70
- HIGH: riskScore 71-100

Risk indicators to evaluate:
- "unusual_amount": transfer amount is significantly higher than the sender's average
- "new_recipient": sender has never transferred to this recipient before
- "velocity_spike": sender has made an unusual number of transfers in a short period
- "new_account": sender's account was created very recently (less than 24 hours)
- "large_transfer": absolute amount exceeds a high threshold
- "odd_hours": transaction occurs between 1:00 AM and 5:00 AM local time
- "balance_drain": transfer amount is more than 80% of the sender's current balance
```

### User Prompt Builder

```typescript
function buildUserPrompt(context: RiskContext): string {
  return JSON.stringify({
    transaction: {
      amount: context.amount,
      currency: context.currency,
      description: context.description,
    },
    sender: {
      accountId: context.fromAccountId,
      currentBalance: context.senderBalance,
      accountCreatedAt: context.senderAccountCreatedAt,
      totalTransactions: context.senderTotalTransactions,
      averageTransferAmount: context.senderAverageAmount,
      transfersLastHour: context.senderTransfersLastHour,
    },
    recipient: {
      accountId: context.toAccountId,
      previousTransfersToRecipient: context.previousTransfersToRecipient,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      hour: new Date().getHours(),
    },
  });
}
```

### Expected Response (parsed from Claude API)

```typescript
interface RiskAssessment {
  riskScore: number;    // 0-100
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  flags: string[];
  reasoning: string;
}
```

### Response Validation

Always validate the parsed response with Zod before using it:

```typescript
const riskAssessmentSchema = z.object({
  riskScore: z.number().int().min(0).max(100),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  flags: z.array(z.string()),
  reasoning: z.string().max(500),
});
```

If the response fails validation, treat it as a fallback scenario.

## Timeout and Fallback

### Timeout

The Claude API call MUST have a **3-second timeout**. Use `AbortController`:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), RISK_ASSESSMENT_TIMEOUT_MS);

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });
  // parse response...
} catch (error) {
  if (error instanceof DOMException && error.name === "AbortError") {
    logger.warn("Risk assessment timed out, using fallback rules");
    return applyFallbackRules(context);
  }
  throw error;
} finally {
  clearTimeout(timeout);
}
```

### Fallback Rules

When Claude API is unavailable, times out, or returns an invalid response:

```typescript
function applyFallbackRules(context: RiskContext): RiskAssessment {
  const flags: string[] = [];
  let riskScore = 0;

  // Rule 1: Large transfer (> $5,000 MXN = 500,000 cents)
  if (context.amount > 500_000) {
    riskScore += 40;
    flags.push("large_transfer");
  }

  // Rule 2: Velocity spike (> 5 transfers in last hour)
  if (context.senderTransfersLastHour > 5) {
    riskScore += 35;
    flags.push("velocity_spike");
  }

  // Rule 3: Balance drain (> 80% of balance)
  if (context.amount > context.senderBalance * 0.8) {
    riskScore += 20;
    flags.push("balance_drain");
  }

  // Rule 4: New account (< 24 hours old)
  const accountAgeHours =
    (Date.now() - new Date(context.senderAccountCreatedAt).getTime()) / 3_600_000;
  if (accountAgeHours < 24) {
    riskScore += 25;
    flags.push("new_account");
  }

  // Cap at 100
  riskScore = Math.min(riskScore, 100);

  const riskLevel: RiskAssessment["riskLevel"] =
    riskScore >= 71 ? "HIGH" : riskScore >= 41 ? "MEDIUM" : "LOW";

  return {
    riskScore,
    riskLevel,
    flags,
    reasoning: "Assessed by fallback rules (AI service unavailable).",
  };
}
```

## Context Gathering

The `RiskAssessmentService` needs data from the database to build the context. Gather this BEFORE calling the API:

```typescript
interface RiskContext {
  // Transaction
  amount: number;                    // cents
  currency: string;
  description: string;
  fromAccountId: string;
  toAccountId: string;

  // Sender profile
  senderBalance: number;             // cents
  senderAccountCreatedAt: string;    // ISO date
  senderTotalTransactions: number;   // all-time count
  senderAverageAmount: number;       // average transfer amount in cents
  senderTransfersLastHour: number;   // count of transfers in last 60 min

  // Relationship
  previousTransfersToRecipient: number; // count of prior transfers to this specific recipient
}
```

Queries to gather this context:

```typescript
// Total transactions by sender
const senderTotalTransactions = await transactionRepo.countByAccount(fromAccountId);

// Average transfer amount
const senderAverageAmount = await transactionRepo.averageAmountByAccount(fromAccountId);

// Transfers in last hour
const senderTransfersLastHour = await transactionRepo.countRecentByAccount(
  fromAccountId,
  new Date(Date.now() - 3_600_000)
);

// Previous transfers to this recipient
const previousTransfersToRecipient = await transactionRepo.countByAccountPair(
  fromAccountId,
  toAccountId
);
```

## Logging

Every risk assessment MUST be logged:

```typescript
logger.info({
  event: "risk_assessment",
  transactionId,
  riskScore: assessment.riskScore,
  riskLevel: assessment.riskLevel,
  flags: assessment.flags,
  source: usedFallback ? "fallback" : "claude_api",
  latencyMs: endTime - startTime,
});
```

## Error Handling

The `RiskAssessmentService.assess()` method MUST return a `Result<RiskAssessment, AppError>`:

- On success (API or fallback): return `success(assessment)`.
- On total failure (both API and fallback crash): return `failure({ code: "RISK_ASSESSMENT_FAILED", statusCode: 503 })`.
- The `TransferService` decides what to do: if risk assessment fails entirely, **block the transfer** (fail-safe, not fail-open).

## Cost Considerations

- Model: `claude-sonnet-4-20250514`
- Max tokens: 256 (small, structured response)
- Temperature: 0 (deterministic)
- Estimated cost per assessment: ~$0.002-0.005
- For a portfolio demo, this is negligible (< $1 for hundreds of test transfers)
