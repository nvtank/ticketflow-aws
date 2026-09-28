# Phase 2 — Database & Authentication

Branch: `feature/phase-2-auth`, based on Phase 1 tip `88a6bfa` while
[Phase 1 PR #2](https://github.com/nvtank/ticketflow-aws/pull/2) awaits review.
The user reassigned Phase 2 from `nguyen-van-hoan` to `nvtank` and confirmed the
Git author `nvtank <tuannguyen.120910@gmail.com>`. Commit timestamps must remain real.

| #   | Planned commit                                                          | Scope                                                         | Validation                           |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| 01  | docs: record phase two database and authentication plan                 | This plan                                                     | Scope/dependencies                   |
| 02  | chore(auth): configure Prisma and local authentication dependencies     | Dependencies, scripts, env setup                              | Install/peer validation              |
| 03  | feat(db): model identity event inventory orders and tickets             | Complete related Prisma schema                                | Prisma validate                      |
| 04  | feat(db): enforce relational inventory and session constraints          | Initial migration and SQL constraints                         | Actual PostgreSQL migration          |
| 05  | feat(db): manage Prisma PostgreSQL client lifecycle                     | Database module and adapter lifecycle                         | Actual PostgreSQL connection         |
| 06  | feat(db): seed local users organizations and event inventory            | Five users, three future events, 200 seats and sample tickets | Seed twice, inspect real rows        |
| 07  | feat(auth): implement password hashing and JWT provider                 | AuthProvider abstraction, bcrypt, JWT                         | Unit/type checks                     |
| 08  | feat(auth): implement registration login and atomic refresh rotation    | DTOs and transactional auth service                           | HTTP/database tests                  |
| 09  | feat(auth): expose validated authentication with secure refresh cookies | Controller, HttpOnly cookie, CSRF and logout                  | Concurrent rotation/revocation tests |
| 10  | feat(auth): enforce authentication roles and organization access        | Global guard, roles, ownership                                | 401/403/cross-org tests              |
| 11  | feat(users): add profile and password management                        | Own profile, password change, session revocation              | HTTP/database tests                  |
| 12  | feat(web): manage authenticated sessions without persistent tokens      | Memory-only access token, bootstrap/refresh, API client       | Typecheck/tests                      |
| 13  | feat(web): implement Vietnamese login and registration forms            | React Hook Form + Zod                                         | Form/E2E tests                       |
| 14  | feat(web): protect workspaces and add account profile                   | Route gates, header, profile, logout                          | Role/E2E tests                       |
| 15  | test(auth): verify validation JWT and role policies                     | Unit tests                                                    | Actual results                       |
| 16  | test(auth): verify database sessions and browser authentication         | Real PostgreSQL/Redis integration and E2E                     | Actual results, no fake pass         |
| 17  | docs: document phase two setup security and validation                  | README/API/database/progress                                  | Final checks                         |

## Security decisions

Use short-lived HS256 access JWTs with issuer/audience/type validation and stable
session IDs; consult PostgreSQL on authenticated requests for revocation, lockout
and current role. Keep access tokens in browser memory only. Refresh tokens are
opaque random values stored as hashes, rotated transactionally and sent only in
HttpOnly SameSite cookies. Refresh replay revokes that login session. Logout and
password changes revoke sessions. Protect cookie mutation endpoints against
cross-origin requests. Public registration always creates CUSTOMER accounts.

Implement AuthProvider as a boundary for future Cognito integration, without AWS
SDK dependencies. Enforce role and organization membership on backend endpoints;
frontend route gates are for UX, not authorization. Forgotten-password and Google
login remain absent until real delivery/OAuth is configured.

## Environment dependency

Docker daemon was not available at start. Continue independent implementation,
but do not claim migrations, seed or database authentication integration pass
until executed against real PostgreSQL/Redis. Do not substitute in-memory data.

## Final grouping

The complete related schema was committed together to keep Prisma relations valid.
Migration SQL and client lifecycle are separate commits. Refresh rotation belongs
to AuthService (08), while its HTTP/cookie boundary is commit 09. The 17-commit
budget is retained; no empty commits or invented history. Actual hashes/messages
are recorded in progress and Git, not inferred from this plan.
