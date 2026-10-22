# API — Phase 2

Base http://localhost:4000/api/v1; Swagger development/test tại
http://localhost:4000/api/docs. Default yêu cầu Bearer JWT; chỉ route Public bỏ qua
authentication. Quyền lấy từ database mỗi request.

| Method | Path                    | Behavior                                               |
| ------ | ----------------------- | ------------------------------------------------------ |
| GET    | `/health/live`          | Public, liveness                                       |
| GET    | `/health`               | Public, PostgreSQL query + Redis PING; 200/503         |
| GET    | `/metrics`              | Local measured HTTP counters, 403 production           |
| POST   | `/auth/register`        | Public, email/name/password; CUSTOMER only; 201        |
| POST   | `/auth/login`           | Public, email/password; 200                            |
| POST   | `/auth/refresh`         | Rotate HttpOnly cookie; 200/401                        |
| POST   | `/auth/logout`          | Revoke cookie session, bearer fallback; idempotent 204 |
| GET    | `/auth/me`              | Current safe user; 200/401                             |
| PATCH  | `/users/me`             | Own name/phone; reject extra DTO keys                  |
| POST   | `/users/me/password`    | currentPassword/newPassword; revoke all sessions; 204  |
| GET    | `/organizations/me`     | ORGANIZER/ADMIN, own memberships                       |
| GET    | `/organizations/:id`    | Membership required, explicit ADMIN access             |
| GET    | `/workspaces/organizer` | ORGANIZER only, user/context                           |
| GET    | `/workspaces/staff`     | STAFF only, user/context                               |
| GET    | `/workspaces/admin`     | ADMIN only, user/context                               |

Register/login/refresh return `{ user, accessToken, expiresIn }` and set
`tixflow_refresh`: HttpOnly, SameSite=Lax, path /api/v1/auth, Secure in production.
Raw refresh token never appears in JSON or browser storage. Use credentials and
Bearer access token. Next proxy forwards cookies. Cookie mutation rejects cross-site
Fetch Metadata/unapproved Origin. Non-browser clients without Origin still require
credentials. Auth/profile responses use no-store.

JWT HS256 validates issuer/audience/expiry/tokenUse/user and session IDs. Revoked,
expired/inactive sessions fail 401 immediately, including old access JWTs.
Password minimum 12 characters, maximum 72 UTF-8 bytes (bcrypt limit). Email
trimmed/lowercased. Registration cannot choose role.

Per-IP/per-handler in-process throttling: default 120/min, register 3/min, login
5/min, refresh 30/min, password change 5/min. Not a distributed production limiter.
Exceptions contain statusCode/code/message/requestId/timestamp and optional details;
X-Request-ID is server generated. Unexpected errors are generic. CORS whitelist,
Helmet and validation whitelist apply globally.

Metrics count completed HTTP requests/errors/statuses in this process; restart resets
counters. No booking/queue/socket metrics yet. Readiness has its own shape for both
200/503 so frontend can display dependency failures without leaking driver details.

Events, booking, payment, ticket, check-in, event CRUD/approval and analytics APIs
are not implemented. Seeded rows do not imply API availability. Missing routes
can require authentication by default before returning 404.
