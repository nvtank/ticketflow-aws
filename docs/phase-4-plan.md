# Phase 4 — Booking & Realtime

Owner/author confirmed: `nvtank <tuannguyen.120910@gmail.com>`.
Branch: `feature/phase-4-booking-realtime`, based on reconstructed Phase 3 `ff4c12b`.
PR #5 and the develop-to-main PR #6 were merged on GitHub during this phase;
those merges were preserved. User changed date policy on 23/10: use simulated
dates from the project timeline. The approved rewrite is applied with original
remote history retained; see [commit-timeline.md](commit-timeline.md).
GitHub PR timestamps and test execution dates remain real.

| #   | Planned commit                                                 | Scope / verification                 |
| --- | -------------------------------------------------------------- | ------------------------------------ |
| 01  | docs: record phase four reservation and realtime plan          | This breakdown and invariants        |
| 02  | chore(realtime): install compatible Socket.IO dependencies     | Nest/server/client/Redis adapter     |
| 03  | feat(shared): define booking and realtime contracts            | Typed ownership-safe snapshots       |
| 04  | feat(db): persist reservation retry keys and requested seats   | Migration/backfill/indexes           |
| 05  | feat(booking): validate sales and lock inventory consistently  | DTO, DB clock, stable row order      |
| 06  | feat(booking): reserve seat groups atomically                  | All-or-nothing, retries, user limit  |
| 07  | feat(booking): release and reconcile expired holds             | Ownership, SOLD safety, scheduler    |
| 08  | feat(booking): expose authoritative customer snapshots         | Effective states and reload recovery |
| 09  | feat(orders): create server priced idempotent checkout orders  | Original expiry, owner/cancel        |
| 10  | feat(realtime): authenticate event rooms and publish revisions | Socket gateway, after-commit only    |
| 11  | feat(realtime): configure Redis adapter and measured counters  | Optional multi-instance adapter      |
| 12  | feat(api): wire booking orders and reconciliation endpoints    | HTTP guards/Swagger/rate limits      |
| 13  | test(booking): verify policies and order transitions           | Meaningful unit coverage             |
| 14  | test(booking): prove concurrent reservations on PostgreSQL     | 20/100, overlap, rollback, expiry    |
| 15  | test(realtime): verify private rooms and committed updates     | Actual Redis/Socket.IO integration   |
| 16  | feat(web): render interactive customer seat map                | Real snapshots, colors, legend, zoom |
| 17  | feat(web): confirm holds and show server timed countdown       | Retry/reload/release/limits          |
| 18  | feat(web): synchronize revisions and pending checkout          | Reconnect/resnapshot, own orders     |
| 19  | test(booking): exercise two customer browser sessions          | Real backend/DB, desktop/mobile/CI   |
| 20  | docs: record phase four validation and operating limits        | README/API/architecture/progress     |

## Invariants

PostgreSQL decides ownership. Lock order: event KEY SHARE, user/event advisory lock
when applicable, sorted requested seat rows, then hold/order. No network calls in
transactions. Inventory revision increments in the same transaction, messages emit
after commit. Do not upgrade a shared event lock to exclusive during competing holds.

Use DB clock after acquiring locks. A hold lasts at most 300 seconds and never past
sales end. Only one effective active hold per customer/event; quantity obeys event
maxTicketsPerOrder. A retry key binds to the same sorted seat list. Expired seats may
be reclaimed without cleanup. Reconciliation scans DB, never Redis TTL notifications,
and only clears seats still HELD by that hold; SOLD is never released.

Checkout prices come from server data; checkout does not extend the hold. Retry keys
and unique hold/order constraints prevent duplicate orders. Late/expired checkout
cannot claim inventory. Payment and ticket issuance remain Phase 5.

Snapshots recover holds after reload and distinguish HELD_BY_ME/HELD_BY_OTHERS without
revealing another user's identity. Socket messages are invalidation hints carrying
revision; REST resync also runs on reconnect and periodically. Redis adapter is
configuration-enabled and tested with actual Redis; PostgreSQL remains authoritative.

## Required evidence

Real PostgreSQL/Redis tests: 20 and 100 concurrent requests for one seat, overlapping
multi-seat atomicity, expiry/reclaim before cleanup, cross-owner rejection, repeated
release/checkout, concurrent same-user holds, order expiry and SOLD cleanup safety.
Socket tests cover auth/origin/room scope, after-commit delivery and revisions.
Browser tests use two independently authenticated customers, no mocked business APIs.
Do not claim payment callbacks/check-in or a production load capacity in this phase.
