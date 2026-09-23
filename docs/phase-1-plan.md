# Phase 1 — Project Setup & Design System

Phase owner: `hoangphatdev`. Author confirmed in this session as
`hoangphatdev <latruonghoangphat@gmail.com>`. Commit dates use the actual clock.
The repository root is the `tixflow/` root from the specification; do not nest a second Git repository.

## Planned atomic commits

| #   | Conventional Commit                                            | Files / scope                                          | Verification                           |
| --- | -------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- |
| 01  | docs: record phase one delivery and commit plan                | docs/phase-1-plan.md                                   | Scope and dependency review            |
| 02  | chore: initialize pnpm workspace and repository tooling        | package.json, pnpm-workspace.yaml, ignore/editor files | Manifest parsing                       |
| 03  | chore(config): add strict TypeScript and quality configuration | packages/config, eslint.config.mjs, prettier           | Config validation                      |
| 04  | feat(shared): define platform constants and API contracts      | packages/shared                                        | Typecheck                              |
| 05  | chore(infra): configure local PostgreSQL and Redis             | infrastructure, .env.example                           | Compose validation if Docker available |
| 06  | feat(api): bootstrap modular NestJS application                | apps/api bootstrap/config                              | Typecheck/build                        |
| 07  | feat(api): standardize validation errors and request logging   | API HTTP foundation                                    | Integration tests in commit 16         |
| 08  | feat(api): add dependency health and request metrics           | API health/metrics                                     | Probe and metrics tests                |
| 09  | feat(web): initialize Next.js App Router application           | apps/web config/layout                                 | Typecheck/build                        |
| 10  | feat(ui): implement accessible design system primitives        | CSS tokens, shadcn components                          | Typecheck/lint                         |
| 11  | feat(web): configure query state and notification providers    | QueryClient, Zustand, Sonner, API client               | Typecheck                              |
| 12  | feat(web): build responsive public navigation and footer       | Public shell                                           | Build/browser smoke                    |
| 13  | feat(web): create discovery landing and honest empty states    | Home, events, status route                             | REST integration and smoke             |
| 14  | feat(web): add responsive role dashboard layouts               | Reusable dashboard shell and role pages                | Typecheck/build                        |
| 15  | feat(web): add application loading and error boundaries        | loading/error/not-found                                | Build/browser smoke                    |
| 16  | test: verify API foundation and responsive application shells  | Vitest and Playwright                                  | Actual automated results               |
| 17  | docs: document local setup architecture and phase results      | README, docs, lockfile/CI if applicable                | Final quality gates                    |

Each commit must contain meaningful changes. Adjust boundaries if implementation evidence requires it;
record actual hashes after delivery. Dependencies are installed before checks; no claimed test pass
without execution. Phase 1 does not implement authentication, database business tables, booking,
payment, check-in, or admission control. Dashboard shells contain no invented KPIs.

## Workflow

Work on `feature/phase-1-foundation`. Do not push or merge without a reviewed milestone.
The initial repository was empty. Local `develop` and `main` now point to the first
planning commit `4d7bee4`; implementation remains on the feature branch for review.
No push, PR or merge has been performed. No AWS services or credentials are needed.
