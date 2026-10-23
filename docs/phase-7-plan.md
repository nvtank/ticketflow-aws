# Phase 7 — Waiting Room & Quality

Owner per team plan and previously confirmed identity:
`nguyen-van-hoan <nguyenvanh842k5@gmail.com>`.
Branch `feature/phase-7-optimization`, base Phase 6 `4239dab`. 17 meaningful commits,
explicitly simulated 19–22/10/2026; actual test dates recorded separately.

| #   | Planned commit                                                    | Scope                   |
| --- | ----------------------------------------------------------------- | ----------------------- |
| 1   | docs: plan waiting room and final quality work                    | This breakdown          |
| 2   | feat(db): persist waiting room capacity and runtime configuration | Migration/env           |
| 3   | feat(shared): define admission contracts and signed token policy  | Contracts/token         |
| 4   | feat(waiting): atomically queue and admit Redis sessions          | Lua/Redis time          |
| 5   | feat(waiting): manage stable user sessions and admission leases   | Service/TTL             |
| 6   | feat(waiting): expose authenticated room endpoints                | DTO/controller/module   |
| 7   | feat(booking): enforce admission before atomic holds              | Gate/expiry/DTO         |
| 8   | feat(events): authorize audited waiting room settings             | Organizer/Admin         |
| 9   | feat(web): render waiting position and server admission deadline  | Customer gate           |
| 10  | feat(web): manage event waiting room settings                     | Organizer configuration |
| 11  | feat(notifications): expose owned receipt notification inbox      | Real DB API             |
| 12  | feat(web): display receipt notifications and unread state         | Inbox/navigation        |
| 13  | fix(quality): harden recovery and permission error handling       | Actual issues found     |
| 14  | test(waiting): verify signed leases and waiting policies          | Unit                    |
| 15  | test(waiting): prove bounded admission and hold authorization     | Real Redis/PostgreSQL   |
| 16  | test(web): verify waiting room and final regression flows         | Playwright/CI           |
| 17  | docs: record final evidence limitations and local runbook         | Delivery/progress       |

Redis Lua owns queue ordering, bounded active leases, expiry/release/promotion.
One user/event session prevents refresh priority resets. Tokens bind user/session/
nonce; PostgreSQL still decides seat ownership. Gate checks occur before DB tx,
then locked event configuration and server expiry are checked inside; no Redis I/O
inside database transactions. Redis failures fail closed only when waiting is on.
Capacity reductions preserve already issued leases until expiry. This is a local
prototype, not verified production fairness/anti-bot protection or 1,000-user capacity.

Final checks include real 100-user admission, FIFO/refresh/expiry, stolen/expired
lease rejection, disabled gate, check-in/booking/payment regression and browser
waiting -> booking. Do not infer success from mocks or unexecuted commands.

Implementation evidence and actual results: [progress.md](progress.md#phase-7--waiting-room--quality). Browser suites use separate API processes to preserve real login rate limits.
