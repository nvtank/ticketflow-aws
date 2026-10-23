# API — Phase 3

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

## Event management

| Method           | Path                                   | Authorization / behavior                                               |
| ---------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| GET              | `/events`                              | Public, published/approved organizations, upcoming, filters/pagination |
| GET              | `/events/:key`                         | Public detail; key is event UUID or slug                               |
| GET              | `/events/:key/seats`                   | Public inventory snapshot, no user/hold identities                     |
| GET              | `/events/:key/inventory`               | Public section totals and revision                                     |
| GET              | `/organizer/dashboard`                 | ORGANIZER, own organizations' real aggregates                          |
| GET/POST         | `/organizer/events`                    | ORGANIZER memberships, list/create (201)                               |
| GET/PATCH/DELETE | `/organizer/events/:id`                | Own event, detail/full editable fields/delete unused draft (204)       |
| POST             | `/organizer/events/:id/submit`         | Valid draft/rejected → pending approval (200)                          |
| POST             | `/organizer/events/:id/seat-map`       | Atomic grid replacement, safe drafts only (200)                        |
| GET              | `/organizer/events/:id/seats`          | Own raw seat configuration snapshot                                    |
| PATCH            | `/organizer/events/:id/seats/:seatId`  | `{enabled: boolean}`, AVAILABLE/UNAVAILABLE only                       |
| GET              | `/organizer/events/:id/history`        | Own event's latest 100 audit entries                                   |
| GET/POST         | `/organizer/events/:id/staff`          | Own assignments; assign active STAFF by `{email}` (201)                |
| DELETE           | `/organizer/events/:id/staff/:staffId` | Remove assignment (204)                                                |
| GET              | `/admin/events/pending`                | ADMIN, paginated review queue                                          |
| GET              | `/admin/events/:id`                    | ADMIN, private review detail                                           |
| GET              | `/admin/events/:id/history`            | ADMIN, latest 100 audit entries                                        |
| PATCH            | `/admin/events/:id/approve`            | ADMIN, pending → published, audited                                    |
| PATCH            | `/admin/events/:id/reject`             | ADMIN, pending → rejected, `{reason}` required                         |

List parameters: `page` (1), `pageSize` (12, max 50). Public filters: `q`, `category`
(MUSIC/CONFERENCE/WORKSHOP/SPORTS/OTHER), exact `city`, ISO8601 `from`/`to`, integer
`minPrice`/`maxPrice`, `sort=date|price_asc|price_desc`. Price filters/sorting use the
minimum ticket-type price. Response `{items, pagination:{page,pageSize,total,totalPages}}`.
Organizer list additionally accepts `status`.

Create requires `organizationId` and event fields. PATCH uses the complete event
fields DTO (not sparse PATCH): title, description, category, venue `{name,address,city}`,
startsAt/endsAt/salesStartAt/salesEndAt, coverUrl (nullable), galleryUrls (up to 8),
ticketPolicy, maxTicketsPerOrder (1–10). Ownership/status cannot be changed in input.
Dates are ISO8601 with timezone. Server validates date ordering and future start.

Grid body: `{sections:[{name,ticketName,priceVnd,rows,columns}]}`; 1–8 sections,
1–26 rows and 1–40 columns each, max 2,000 seats total. Shared ticket names must
have the same price. Codes continue across sections: A01…Z01, AA01…; unique per event.

400 validation, 401 unauthenticated, 403 role/membership/organization denied,
404 unknown or non-public event, 409 incompatible lifecycle/history/concurrent decision.
Writes lock the event row and audit in one PostgreSQL transaction. Pending/published
content is immutable. Review requires valid future schedule and enabled inventory.

Public seat snapshots use a repeatable-read transaction and return eventId, revision,
serverTime, seats. Expired/released HELD entries are projected as AVAILABLE;
SOLD remains SOLD. This is read-side availability, not a reservation endpoint.
Private organizer snapshots expose configuration status; no hold identities.

Booking, payment, ticket issuance, check-in and detailed analytics APIs remain for
later phases. Staff assignment alone does not implement check-in.
