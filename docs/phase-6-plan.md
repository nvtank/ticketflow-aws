# Phase 6 — Check-in & Analytics

Authorized owner: `hoangphatdev <latruonghoangphat@gmail.com>` (Phase 6 assignment
and previously confirmed Git identity). Branch `feature/phase-6-checkin`, based on
Phase 5 `113c52b`. PR #9 is merged on GitHub. 17 meaningful commits use explicitly
simulated dates 15–18/10/2026; tests and external actions report actual dates.

| # | Planned commit | Scope |
| --- | --- | --- |
| 1 | docs: plan phase six check-in and analytics | Breakdown/invariants |
| 2 | chore(web): install QR scanner and analytics charts | ZXing/Recharts/lockfile |
| 3 | feat(db): index check-in and reporting queries | Revision/migration/indexes |
| 4 | feat(shared): define check-in analytics and admin contracts | Typed API/realtime |
| 5 | feat(checkin): authorize assigned staff and verify ticket credentials | Policy/DTO/resolution |
| 6 | feat(checkin): confirm admission atomically with audit | Transaction/concurrency |
| 7 | feat(staff): expose assigned events and attendance stats | REST/module |
| 8 | feat(analytics): aggregate scoped sales and attendance | Date/range/reporting |
| 9 | feat(admin): aggregate platform dashboard and measured monitoring | Real KPIs/process metrics |
| 10 | feat(admin): manage account access and organization review | DTO/authorization/audit |
| 11 | feat(realtime): publish private check-in revisions and revoke rooms | Staff rooms/reconnect |
| 12 | feat(web): implement mobile staff scanner and manual admission | Camera/fallback/results |
| 13 | feat(web): visualize organizer sales and attendance | Recharts/filter/tables |
| 14 | feat(web): implement admin overview access and review | Users/orgs/monitoring |
| 15 | test(checkin): verify credential state and reporting policies | Unit/HTTP |
| 16 | test(checkin): prove concurrent admission and full browser flow | Real DB/Redis/E2E/CI |
| 17 | docs: record phase six evidence and operating instructions | README/progress/API |

## Invariants and scope

- Verify never consumes a ticket. Confirm re-verifies signature/hash or random
  manual ticket code against DB; only assigned active STAFF can act for that event.
- Event KEY SHARE and staff user SHARE locks serialize admission against assignment
  revocation, account locking and event cancellation. Sorted locking plus ticket
  FOR UPDATE/conditional VALID -> USED and CheckIn.ticketId unique protect retries.
- Confirm writes ticket state, CheckIn staff/time, audit and revision in one tx.
  Emit only after commit; no camera/network/Redis in PostgreSQL transactions.
- Business invalid/used/cancelled/wrong-event results are explicit. No buyer PII or
  QR secrets in stats/socket hints. Private staff rooms enforce assignment; REST is
  authoritative after reconnect and permission changes.
- Organizer data is scoped to organization membership; admin routes enforce ADMIN.
  Revenue counts each PAID order once, never callback/payment duplicates. Inventory
  and period measures have explicit definitions and Vietnam date boundaries.
- Admin cannot lock ADMIN accounts through this UI. Locking other accounts revokes
  sessions; unlock requires fresh login. Organization decisions are pending-only,
  validated/audited, and concurrent decisions yield one winner.
- Real metrics only; no worker/queue figures without a worker. No AWS or fake data.
- Test actual DB/Redis concurrent 20/100 admission, revoked/unassigned staff, wrong
  event/credential/status, audit rollback, known revenue/date aggregates, admin
  permissions and browser customer payment -> staff check-in -> organizer analytics.
- Camera is device-dependent; local tests must distinguish decoder/fake camera
  evidence from physical mobile camera verification. Do not claim unperformed tests.
