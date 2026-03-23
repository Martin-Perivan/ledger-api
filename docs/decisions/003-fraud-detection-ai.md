# ADR-003: AI-Powered Fraud Detection via Claude API

## Status
Accepted

## Context
Fintech platforms need to detect and prevent fraudulent transactions. Common approaches:

1. **Rule-based engine**: Hardcoded rules (e.g., "block transfers > $50,000").
2. **ML model**: Train a model on historical transaction data.
3. **LLM-based assessment**: Use a large language model to evaluate transaction context and assign a risk score.

## Decision
Use the **Anthropic Claude API** (claude-sonnet-4-20250514) as the primary fraud detection engine, with a hardcoded rule-based fallback.

## Rationale

- **No training data**: This is a new platform with no historical transaction data. ML models require labeled datasets to be effective.
- **Contextual reasoning**: An LLM can evaluate multiple signals simultaneously — amount relative to history, recipient novelty, time of day, velocity — and produce a reasoned risk assessment. This is closer to how human fraud analysts think.
- **Structured output**: Claude API can return JSON with `riskScore`, `riskLevel`, and `flags`, making integration straightforward.
- **Graceful degradation**: If the API is unavailable or slow (>3 seconds), the system falls back to basic hardcoded rules. The transaction is never blocked indefinitely due to an AI outage.
- **Portfolio value**: Demonstrates practical AI integration in a fintech context — not a chatbot, but a functional component in the transaction pipeline.

## Fallback Rules (when Claude API is unavailable)

```
IF amount > 500,000 cents ($5,000 MXN)  → HIGH risk
IF sender has > 5 transfers in last 60s → HIGH risk
ELSE                                     → LOW risk (allow)
```

## Prompt Design

The risk assessment prompt includes:
- Transaction details (amount, currency, sender, recipient)
- Sender's recent transaction history (last 10 transactions)
- Account age and total transaction count
- Time of day
- Instructions to return ONLY a JSON object with `riskScore`, `riskLevel`, and `flags`

## Consequences

- Adds ~500ms-2s latency to each transfer (Claude API round trip). Acceptable for the transaction type.
- Costs per transaction (Sonnet pricing). For a portfolio project, this is negligible.
- Requires an Anthropic API key in production. The fallback ensures the system still works without it.
- The AI assessment is logged in the `transactions` document and `auditLogs` for transparency.
