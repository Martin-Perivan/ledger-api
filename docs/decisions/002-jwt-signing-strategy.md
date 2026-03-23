# ADR-002: JWT Signing Strategy — HS256 for MVP

## Status
Accepted

## Context
JWT tokens need a signing algorithm. The two main options are:

1. **HS256 (HMAC-SHA256)**: Symmetric — one shared secret signs and verifies.
2. **RS256 (RSA-SHA256)**: Asymmetric — private key signs, public key verifies.

## Decision
Use **HS256** for the MVP release, with a documented migration path to RS256.

## Rationale

- **Single-service architecture**: Ledger API is one Express server. There is no separate service that needs to verify tokens independently using a public key.
- **Simplicity**: HS256 requires one environment variable (`JWT_SECRET`). RS256 requires key pair generation, secure storage of the private key, and distribution of the public key.
- **Time constraint**: This project is built within 24 hours. HS256 is faster to implement correctly.
- **Security is still strong**: HS256 with a 64-character random secret is cryptographically secure for a single-service deployment. The OWASP and JWT RFC both consider HS256 acceptable when the secret has sufficient entropy.

## Migration Path to RS256

When the system evolves to microservices (e.g., a separate auth service, an admin dashboard), RS256 becomes necessary:

1. Generate RSA key pair: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`
2. Store `private.pem` in the auth service only.
3. Distribute `public.pem` to all services that verify tokens.
4. Change `jwt.sign()` algorithm to `RS256` and pass the private key.
5. Change `jwt.verify()` to use the public key.

## Consequences

- Tokens can be forged if the `JWT_SECRET` is leaked. Mitigated by: not committing `.env`, using Railway's encrypted env vars.
- Not suitable for multi-service token verification without sharing the secret. Addressed in roadmap Phase 2.
