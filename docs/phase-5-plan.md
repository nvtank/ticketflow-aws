# Phase 5 — PayOS Payment & Ticketing

Owner/author authorized by the user: `hoangphatdev <latruonghoangphat@gmail.com>`.
Branch: `feature/phase-5-payments`, based on Phase 4 `d94dd7c`.
17 meaningful commits, simulated author/committer dates 11–14/10/2026 per the
approved timeline. Actual execution/test dates are reported separately.

PayOS is the configured payment provider. User supplied local channel credentials;
these stay in ignored .env, never source/logs/PR. No public HTTPS webhook URL exists
yet: complete local verification first. Do not claim a real bank transfer/webhook
round trip without observing one. Mock provider is test/development only.

| # | Planned commit | Files / scope |
| --- | --- | --- |
| 1 | docs: plan phase five PayOS payment and ticket delivery | This plan |
| 2 | chore(payments): install PayOS SDK and QR renderer | Manifests/lockfile |
| 3 | feat(db): persist payment sessions and verifiable ticket credentials | Schema/migration |
| 4 | feat(config): validate private payment provider configuration | Env/config/tests |
| 5 | feat(shared): define payment and ticket contracts | Shared API types |
| 6 | feat(payments): implement verified PayOS provider adapter | Provider interface/SDK |
| 7 | feat(payments): prepare idempotent server priced payment sessions | Creation service |
| 8 | feat(tickets): sign and authorize QR ticket credentials | Ticket service/crypto |
| 9 | feat(payments): finalize verified payments atomically | Locks/state/tickets/audit |
| 10 | feat(payments): expose callbacks and owner payment reconciliation | DTO/controller/module |
| 11 | feat(payments): support isolated local payment simulation | Dev-only signed provider |
| 12 | feat(web): connect checkout to PayOS and verified payment status | Checkout/result pages |
| 13 | feat(web): display owned tickets with QR and order links | My tickets/detail/navigation |
| 14 | test(payments): verify signatures and state transitions | Unit/HTTP |
| 15 | test(payments): prove callback retry and late payment integrity | Real DB/Redis integration |
| 16 | test(web): verify payment and ticket flow across viewports | Playwright/CI |
| 17 | docs: document PayOS configuration and phase five evidence | README/API/progress |

## Invariants

- PostgreSQL remains final authority. Order/customer/event/seat/hold locks follow
  Phase 4 ordering. Network calls to PayOS happen outside DB transactions.
- One stable payment attempt/order/provider, server amount, unique provider order
  code and link reference. Retry after timeout recovers the same external request.
- Signed webhook verifies with the installed official SDK. Authenticated remote
  status query is another trusted reconciliation source; browser return parameters
  never prove payment. Unknown verification sample is acknowledged without sale.
- Deduplicate transaction references; validate amount, currency, link and order code.
  Duplicate/concurrent callbacks issue one ticket/item. Same reference with altered
  contents is rejected. Late/mismatched ownership cannot sell seats: refund review.
- Expiry uses DB processing time, original hold deadline; no transaction spans an
  external API. Sold seats survive cleanup. No automatic refunds or bank transfers.
- QR contains only a signed opaque credential; hash checked in DB, ownership required
  for retrieval. Historical seed hash-only tickets have no fabricated usable QR.
- Real integration covers duplicate callbacks, unknown signatures, wrong amounts,
  cancellation/expiry/reclaim races, ticket uniqueness, ownership and rollback.

## Official references checked

- https://payos.vn/docs/sdks/back-end/node/
- https://github.com/payOSHQ/payos-lib-node
- https://payos.vn/docs/api/
