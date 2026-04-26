/**
 * Sets test environment variables before any module is imported.
 * Must be loaded via jest globalSetup or setupFiles.
 * @module tests/helpers/setup-env
 */

process.env["NODE_ENV"] = "test";
process.env["PORT"] = "3001";
process.env["MONGODB_URI"] = "mongodb://localhost:27017/ledger_test?replicaSet=rs0";
process.env["DATABASE_NAME"] = "ledger_test";
process.env["JWT_SECRET"] =
  "test_secret_that_is_at_least_sixty_four_characters_long_for_testing_purposes_only";
process.env["JWT_EXPIRES_IN"] = "3600";
process.env["ANTHROPIC_API_KEY"] = "sk-ant-test-key-for-testing";
process.env["ANTHROPIC_MODEL"] = "claude-sonnet-4-20250514";
process.env["RISK_ASSESSMENT_TIMEOUT_MS"] = "3000";
process.env["RATE_LIMIT_WINDOW_MS"] = "60000";
process.env["RATE_LIMIT_MAX_REQUESTS"] = "1000";
process.env["CORS_ORIGIN"] = "http://localhost:3001";
