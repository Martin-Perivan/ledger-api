# Roadmap

## Phase 1 — MVP (Current Release)

- [x] User registration and login (JWT HS256)
- [x] Digital wallet accounts (create, list, detail)
- [x] Deposits with idempotency
- [x] P2P transfers with double-entry ledger
- [x] AI fraud detection (Claude API)
- [x] Rate limiting, Helmet, CORS, Zod validation
- [x] Audit log (append-only)
- [x] Swagger / OpenAPI documentation
- [x] Postman collection
- [x] Deployed on Railway + MongoDB Atlas

## Phase 2 — Security Hardening

- [ ] Migrate JWT from HS256 to RS256 (asymmetric key pair)
- [ ] Refresh token rotation with token family tracking
- [ ] Request signing (HMAC-SHA256) for payload integrity
- [ ] Account lockout after N failed login attempts
- [ ] IP-based anomaly detection in audit log

## Phase 3 — Feature Expansion

- [ ] Withdrawals (cashout simulation)
- [ ] Multi-currency support with exchange rates
- [ ] Scheduled/recurring transfers
- [ ] Transaction reversal (void + compensating entries)
- [ ] Webhooks for transaction events
- [ ] Account freeze/unfreeze by admin

## Phase 4 — Observability & Scale

- [ ] Structured logging with correlation IDs (OpenTelemetry)
- [ ] Health check endpoint (`/health` with DB status)
- [ ] Prometheus metrics endpoint
- [ ] MongoDB connection pooling optimization
- [ ] Horizontal scaling documentation (stateless API)
- [ ] Load testing with k6

## Phase 5 — Compliance & Governance

- [ ] Data encryption at rest (MongoDB Atlas encryption)
- [ ] PII masking in logs and audit trail
- [ ] GDPR-compliant data deletion (soft delete + anonymization)
- [ ] Role-based access control (RBAC) for admin vs user
- [ ] API versioning strategy (v1, v2)
