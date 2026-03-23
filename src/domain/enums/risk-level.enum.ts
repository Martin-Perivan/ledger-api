/**
 * Risk classification levels for fraud detection assessments.
 * LOW: 0-40, MEDIUM: 41-70, HIGH: 71-100.
 * @module domain/enums/risk-level
 */

enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export { RiskLevel };
