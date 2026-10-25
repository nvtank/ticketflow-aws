# API — Phase 6

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

Payment and ticket issuance are implemented in Phase 5 below. Check-in and detailed
analytics remain later phases. Staff assignment alone does not implement check-in.

## Reservations and checkout

All routes below require current CUSTOMER JWT/session authorization. UUID params
are event IDs (public event detail resolves slug → ID). Money comes from PostgreSQL.

| Method | Path                        | Behavior                                                                   |
| ------ | --------------------------- | -------------------------------------------------------------------------- |
| POST   | `/events/:id/holds`         | `{seatIds, idempotencyKey}` UUIDs; atomic group reservation (201)          |
| GET    | `/holds/:id`                | Owner only; original requested IDs, effective state, expiry and serverTime |
| DELETE | `/holds/:id`                | Owner only; idempotent release (200), pending order cancels/expires        |
| GET    | `/events/:id/booking-state` | Private consistent snapshot with my active hold                            |
| POST   | `/orders`                   | `{holdId, idempotencyKey}`, owner only, server-priced items (201)          |
| GET    | `/orders/me`                | Paginated own order history (`page`, `pageSize`)                           |
| GET    | `/orders/:id`               | Owner only; effective expiry status, event/items/prices                    |
| DELETE | `/orders/:id`               | Cancel own unpaid order; return authoritative current order (200)          |

One effective active hold/customer/event, event max (default 4, configurable 1–10).
Duplicate/case-equivalent IDs and excess quantity are rejected. Retry key binds to
the same event/sorted seat list; repeated success neither duplicates nor extends the
hold. Conflicting key/seat/active hold → 409. Invalid DTOs/extra prices → 400,
wrong role/owner → 403, anonymous → 401. Hold POST has 240/IP/min and order POST
30/IP/min; authentication endpoints retain stricter limits. Limits are process-local.

Hold expiry is `min(PostgreSQL clock + 300 seconds, sales end)`. Checkout uses the
same expiration and creates no payment/ticket. Expired pending orders are projected
as EXPIRED before background cleanup updates their stored status. Release/cleanup
only clears matching HELD rows, never SOLD. Reclaim does not depend on cleanup.

Booking snapshot returns eventId, revision, serverTime, sale window, maximum,
activeHold (owner only) and seats. States: AVAILABLE, HELD_BY_ME, HELD_BY_OTHERS,
SOLD, UNAVAILABLE. No other customer/hold identity is exposed. Public seat endpoints
retain the generic HELD state. Own hold responses include own orderId for reload.

## Socket.IO

Endpoint: API origin port 4000, path `/socket.io`, WebSocket transport only. Handshake
`auth: {token: accessJWT}` is verified against current DB session. Origin must match
CORS_ORIGINS (non-browser clients without Origin still require JWT). No credentials
in query strings. Event messages never reserve or sell seats.

Emit `event:join` with `{eventId}` and acknowledgement callback. Server revalidates
session/public event, limits join frequency and joins one `event:{id}` room. Joining
arbitrary room names is rejected. `user:{id}` is assigned only from authenticated
identity for minimal private order notifications.

`seat:held`, `seat:released`, `seat:sold`, `inventory:updated` carry
`{eventId, seatIds, revision, occurredAt}` after commit. `order:updated` carries
`{orderId, eventId, status}` to its owner. The frontend listens to inventory hints,
refetches complete REST snapshots, ignores stale revisions/responses, resyncs on
reconnect/focus and polls every 10 seconds. Order UI refreshes every 5 seconds.

Redis adapter may be enabled with SOCKET_REDIS_ADAPTER=true. It distributes events,
not ownership. Redis outages/missed messages require REST resync; no durable outbox
or guaranteed event replay is implemented yet. API must start with reachable Redis
when this adapter is enabled. With it disabled, degraded dependencies can still be
reported through readiness.

Metrics add actual current-process hold successes/failures, socket connection count,
adapter configuration and validHeldSeats queried from the shared DB. DB outage
returns null for validHeldSeats, not a fabricated zero. Production metrics remain
forbidden. No queue/payment/check-in counters are invented.

## Payments and tickets (Phase 5)

| Method | Path                     | Authentication / behavior                                                     |
| ------ | ------------------------ | ----------------------------------------------------------------------------- |
| GET    | `/payments/config`       | Public; provider name and availability only                                   |
| POST   | `/payments/create`       | CUSTOMER owner; `{orderId,idempotencyKey}` UUIDs; 201, server amount/deadline |
| GET    | `/payments/:id/status`   | CUSTOMER owner; SDK provider reconciliation with DB claim throttle            |
| POST   | `/payments/webhook`      | Public HTTP route, mandatory provider signature; 200 after committed handling |
| POST   | `/payments/:id/simulate` | Owner, development/test and mock provider only; 404 otherwise                 |
| GET    | `/tickets/me`            | CUSTOMER; paginated owned tickets, Cache-Control no-store                     |
| GET    | `/tickets/:id`           | CUSTOMER owner; signed QR only when VALID/hash/version match; no-store        |

Payment create is limited to 20/IP/min. Same order reuses the same external request;
a retry UUID bound to another order or a provider switch returns 409. Money supplied
by the client is rejected by DTO whitelisting. Signature/malformed webhook errors
return 400; a processed event reference with changed normalized content returns 409. Unknown signed provider samples are acknowledged without creating a sale.
Provider transport/signature failures on status/create return sanitized 502; UI
never treats that as paid. All payment/ticket owner checks are backend enforced.

Payment view: id, orderId, provider, status, orderStatus, amountVnd, checkoutUrl,
expiresAt, serverTime. BigInt provider order codes and channel secrets are not exposed.
Ticket view: id/code/status, event/order IDs, seat/section/price, event time/venue,
qrCredential (nullable). Credentials contain no PII and are not logged.

Mock outcome enum: success, failed, cancelled, delayed, duplicate. Delayed state is
stored in DB and becomes eligible after 10 seconds, not an in-memory success timer.
Requests reconcile the same finalization service. PayOS runtime cannot use this API
as a payment-success shortcut, even for an authenticated owner.

REFUND_REQUIRED means manual financial review, not a completed refund. A paid order
can retain valid tickets while a distinct extra transfer requires review; otherwise
late/mismatched settlements produce no tickets. The browser's success/failed URL
and its parameters never authorize ticket issuance. See [payments.md](payments.md)
for setup, exact-settlement limits and actual external verification evidence.

## Phase 6 — Staff, analytics and admin

- STAFF: GET `/check-in/events`, GET `/check-in/events/:id/stats`; assignment required.
- POST `/check-in/verify` (201) and `/check-in/confirm` (201), body
  `{eventId,credential}`. Verify returns explicit outcome without consuming a ticket.
  Confirm rechecks assignment/credential/state inside transaction; used → 409,
  wrong/cancelled/invalid → 422, unassigned → 403. Random manual ticket codes or
  signed QR accepted; no client-declared seat rights. 240 requests/IP/min per action.
- ORGANIZER: GET `/organizer/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD&eventId=&organizationId=`.
  Membership scope, inclusive Vietnam dates, max 366 days. Revenue/tickets use PAID
  orders in the period; inventory/check-in are current lifetime totals. No duplicate
  revenue from retries/extra transfers. Ten recent orders, up to 100 section groups.
- ADMIN: GET `/admin/dashboard`, `/admin/monitoring`, `/admin/users?q=&role=&page=`,
  `/admin/users/:id`, `/admin/organizations?status=&page=`, organization `/:id/history`.
- PATCH `/admin/users/:id/access` body `{isActive,reason}`; sessions revoked on lock,
  all ADMIN targets protected. PATCH `/admin/organizations/:id/review` body
  `{decision:APPROVED|REJECTED,reason}`, pending-only, atomic audit. Reasons 10–500 chars.
- Socket `staff:event:join` reauthenticates STAFF assignment, room `staff-event:{id}`.
  `checkin:updated` contains eventId/revision/occurredAt only after commit; REST resync
  on reconnect/poll. Revocation leaves staff room; account lock disconnects sockets.

## Phase 7: waiting room and notifications

All endpoints require JWT. CUSTOMER uses:

| Method | Path                                   | Result                                           |
| ------ | -------------------------------------- | ------------------------------------------------ |
| POST   | `/events/:id/waiting-room/join`        | 201 stable session/status/admission              |
| GET    | `/events/:id/waiting-room`             | 200 current status; does not join                |
| DELETE | `/events/:id/waiting-room`             | 200 own lease removed; next promoted             |
| PATCH  | `/events/:id/waiting-room/settings`    | 200 Organizer membership/ADMIN only              |
| GET    | `/notifications/me?page=1&pageSize=20` | 200 owned items/unread/pagination                |
| PATCH  | `/notifications/:id/read`              | 200 owned, idempotent mark read; other owner 404 |

Settings body: `{ "enabled": true, "capacity": 20 }`, capacity integer 1–500.
Room state: DISABLED/NOT_JOINED/WAITING/ADMITTED, position, peopleAhead, queued,
active, capacity, expiresAt, serverTime, admissionToken (only admitted). Refresh
preserves nonce and expiry. Gate endpoints have 240 requests/minute limit per IP.
No client user IDs are accepted. Missing/stolen token 403, expired lease 409,
Redis failure 503. `POST /events/:id/holds` accepts optional `admissionToken`,
required when the room is enabled. Confirmed owned holds can create orders without
renewing admission. Public/managed event detail includes waitingRoomEnabled/Capacity.

Settings enabled/capacity and optional inbox page/pageSize are explicit Swagger
properties, verified against the running local `/api/docs-json` document.

## Google authentication

Google configuration/challenge/login and authenticated link/methods endpoints are
documented in [google-auth.md](google-auth.md). Google-only users have no local
password; email collisions require explicit linking by the authenticated owner.

## Artist discovery and booking reviews

All paths below are under `/api/v1`; query fields validated by DTOs are documented
in Swagger. Public APIs never return email, ticket IDs or QR credentials.

| Method | Path                              | Access / behavior                                                                                                                                    |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/artists`                        | Public. `q`, `genre`, `eventId`, `page`, `pageSize` (max 50); published profiles, genre choices and upcoming public-event counts                     |
| GET    | `/artists/:slug`                  | Public published profile and up to 24 upcoming events belonging to approved organizations; private events excluded                                   |
| GET    | `/reviews`                        | Public. `eventId`, `rating` (1–5), `sort=recent\|highest`, pagination; actual average/count/distribution, no invented fallback ratings               |
| GET    | `/events/:eventId/review-context` | Authenticated own eligibility/review                                                                                                                 |
| PUT    | `/events/:eventId/review`         | Authenticated. `{rating: 1..5, comment: 10..2000 chars}`. Requires owned paid valid/used ticket, published/completed event and approved organization |
| DELETE | `/reviews/:id`                    | Authenticated author only; others receive 404                                                                                                        |

One review per author/event. PUT serializes same-author submissions using a
PostgreSQL transaction advisory lock and locks purchase records while verifying
eligibility. Both PUT and DELETE audit their changes and are throttled. Public
reads hide reviews if the author is locked, the ticket cancelled, payment is no
longer paid, or the event/organization becomes private. Comments are rendered as
escaped text. These are booking-experience reviews, not attendance testimonials.

Public `GET /events/:key` also reads completed events from approved organizations,
so a community review can lead back to its event. The upcoming catalog and seat
purchase flows keep their existing published/open-sales requirements.
