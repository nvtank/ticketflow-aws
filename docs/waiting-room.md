# Local waiting room

This is an authenticated local prototype, not verified production fairness, anti-bot
protection or a measured 1,000-user service. PostgreSQL remains the authority for seats.

## Run and demonstrate

Use the normal README Docker/migration/seed/dev commands. Log in as Organizer, open
an owned event in `/organizer/events`, enable “Phòng chờ” with capacity 1 and save.
Open the event booking page as two different CUSTOMER accounts in separate browsers.
Each presses “Vào hàng đợi”. First receives admission; second sees position 1.
Refresh preserves the position and expiry. First presses “Rời hàng đợi”; the next
poll admits the second. A confirmed hold can finish checkout even after admission
expires. Customer notifications appear at `/notifications` after verified payment.

ADMIN may configure an event through the documented settings API. Ordinary Organizer
can only configure approved organization memberships. Every change is audited.
Capacity is 1–500, default 20; reductions preserve existing leases until they expire.

## Correctness and boundaries

One PostgreSQL WaitingRoomSession per event/user keeps the stable session ID. Redis
owns active queue metadata and nonces; PostgreSQL timestamps provide an activity
trace and never restore access when Redis has lost a lease. Five keys share an
event hash tag (`wr:{eventId}:...`), permitting one Lua execution to expire sessions,
allocate FIFO sequence numbers, release and promote without exceeding capacity.
Redis TIME determines lease expiry. Idle queue expiry is 1,800 seconds; active
admission is 600 seconds by default, configured through validated environment fields.
Polling every two seconds runs reconciliation/promotion; no keyspace notification
is required. Inactive keys expire after 24 hours. Queue expiry is fixed, not renewed
by refresh. Large expiry batches are bounded to 1,000 per execution; caller expiry
is always checked. Expired queued users are skipped before promotion.

`wa1` HMAC credentials bind the stable session and a random per-join nonce. They
contain no personal data. Backend verifies signature, database ownership and the
current Redis lease. Leave, expiry or Redis restart invalidates the nonce. Tokens
stay in memory; refreshing fetches the existing lease, rather than extending it.
Joining again after expiry obtains a new nonce and FIFO position. Enabled gates
fail closed with 503 if Redis is unavailable; disabled gates do not require Redis
for admission checks. Optional multi-instance Socket.IO Redis adapter has separate
startup availability requirements.

The Redis check completes before opening the booking transaction. Inside it,
the locked event configuration and admission deadline are checked against database
time. A concurrent enable between preflight and transaction requires admission;
a confirmed owned hold is sufficient for order creation. An already authorized
in-flight request may finish after a concurrent leave; seat availability and the
hold deadline are still decided atomically in PostgreSQL. No Redis/network call
is awaited inside the booking transaction. Admission does not reserve a seat or
extend a five-minute hold. Lowering capacity does not revoke active leases.

Room presence is approximate (lease lifetime, not instant browser connectivity).
Polling, authenticated accounts and rate limits are appropriate to this prototype;
there is no CAPTCHA, IP-fairness, fraud model or distributed durable queue guarantee.
Redis restart requires users to join again. No worker or pretend queue metrics.

## Checks

`pnpm test` includes signature modification, wrong key, malformed credentials,
sale validation and duration bounds. `pnpm test:integration` uses test PostgreSQL
55432 and Redis 56379: 100 simultaneous users with capacity five, FIFO, refresh,
expiry, stale/stolen tokens, actual holds and checkout, scoped settings/audit and
notification ownership/read idempotency. `pnpm test:e2e:waiting` exercises two real
browser sessions through waiting, purchase and notification. `pnpm test:e2e:integration`
runs all authenticated suites sequentially with fresh API processes to isolate
IP rate-limit state, without relaxing security limits. Foundation dependency-failure suite runs separately
with `pnpm exec playwright test` after building.
