# ADR-004: Deployment on Railway + MongoDB Atlas

## Status
Accepted

## Context
The project needs to be deployed and accessible via a public URL. Options considered:

1. **AWS (EC2/ECS/Lambda)**: Full control, enterprise-grade, but complex setup (IAM, VPC, security groups, ALB).
2. **Azure App Service**: Good integration with Azure DevOps, but overhead for a single-service demo.
3. **Railway**: PaaS with GitHub integration, auto-deploy, HTTPS, and env var management.
4. **Render**: Similar to Railway, slightly less flexible on build configuration.

## Decision
Deploy on **Railway** (backend API) with **MongoDB Atlas M0** (free tier, database).

## Rationale

### Railway
- **Speed**: Deploy from GitHub push in ~2 minutes. Critical for a 24-hour project.
- **HTTPS by default**: Automatic TLS certificate on the generated domain.
- **Environment variables**: Encrypted, managed via dashboard or CLI.
- **Logs**: Real-time log streaming without additional configuration.
- **Container portability**: Railway can build the repository `Dockerfile`, preserving the same runtime assumptions used locally and on other container platforms.
- **Cost**: Free tier or $5/month hobby plan is sufficient for a portfolio project.

### MongoDB Atlas M0
- **Free tier**: 512MB storage, shared cluster — sufficient for a demo.
- **Replica set out of the box**: Required for multi-document transactions. Local Docker Compose simulates this, but Atlas provides it natively in production.
- **Production caveat**: Atlas Network Access still matters. Railway deployments may require an explicit outbound IP allowlist or, during temporary diagnostics only, a broad allowlist such as `0.0.0.0/0` to confirm the issue before tightening access.

## Why Not AWS/Azure

- The project demonstrates **code quality and architecture**, not infrastructure management.
- The reviewers (Certero Estudio partners) will evaluate the GitHub repository and the live API endpoints — not CloudFormation templates.
- In an interview context, the correct framing is: "I deployed on Railway for rapid iteration, but the architecture is stateless and containerized — it can be moved to ECS, Cloud Run, or any Kubernetes cluster without code changes."

## Consequences

- Railway's free tier has sleep behavior after inactivity (cold starts). Acceptable for a demo.
- No auto-scaling. Single instance is sufficient for the expected load.
- The repository `Dockerfile` now defines the deployment contract: multi-stage build, Chainguard Node 24 base images, non-root runtime user, and a container health check against `GET /health`.
- Production hardening still requires restricting MongoDB Atlas network access to a fixed outbound IP strategy instead of leaving a broad allowlist in place.
