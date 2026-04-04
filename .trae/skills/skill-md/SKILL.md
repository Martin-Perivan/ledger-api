---
name: "backend-engineer"
description: "Routes Trae to the canonical Ledger API backend skill. Invoke when changing architecture, domain logic, services, routes, security, tests, or repository guidance."
---

# Backend Engineer

This file is the Trae project skill entrypoint.
Trae supports a single project `SKILL.md`, so keep this manifest concise and use it only to route the agent to the canonical skill materials in `.agents/skills/`.

Use this skill when the task changes backend behavior, API contracts, financial workflows, fraud detection, or the repository guidance that controls backend work.

## Routing

- Load the relevant skill from `.agents/skills/`.
- Use the matching skill directory for the task at hand.
- For Ledger API work, use `.agents/skills/backend-engineer/`.

## Manifest Rules

- Do not duplicate detailed skill instructions in this file.
- Keep this manifest focused on discovery and routing for Trae.
