# Phase 3 — Event Management

Base: `origin/develop` at `16f6146` (Phase 2 merged via PR #4).
Branch: `feature/phase-3-events`. The user confirmed Phase 3 author/owner
`nguyen-van-hoan <nguyenvanh842k5@gmail.com>`, overriding the initial team plan.
Use real timestamps and meaningful commits; no AWS provisioning.

| # | Planned commit | Files / modules | Validation |
| --- | --- | --- | --- |
| 01 | docs: record phase three event management plan | This plan | Scope/dependencies |
| 02 | feat(shared): define event management contracts | shared event types | Shared build |
| 03 | feat(db): store event galleries and catalog indexes | Prisma/migration | Real migration/generate |
| 04 | feat(events): validate event dates and seat grids | DTOs/policies | Unit/type checks |
| 05 | feat(events): create and edit organization scoped drafts | Organizer service | DB ownership tests |
| 06 | feat(seats): generate grids and protect purchased inventory | Seat service | Atomic/immutability tests |
| 07 | feat(events): submit reviewable events and record decisions | Lifecycle/audit | State/race tests |
| 08 | feat(events): expose filtered public catalog and inventory | Public service/API | Filter/visibility tests |
| 09 | feat(organizer): expose event management and real overview | Controllers/module | HTTP/RBAC checks |
| 10 | feat(admin): review events with approval history | Admin API | HTTP/admin tests |
| 11 | feat(web): add public event filters and details | Catalog/detail pages | URL/real API checks |
| 12 | feat(web): manage organizer events and overview | Organizer pages | Real API/typecheck |
| 13 | feat(web): edit event drafts with validated forms | RHF/Zod editor | Form/DB flow |
| 14 | feat(web): manage seat grids and assigned staff | Seat/staff editor | Protection/error UX |
| 15 | feat(web): review events in admin workspace | Admin review UI/nav | Decision/error UX |
| 16 | test(events): verify lifecycle ownership and inventory safety | Unit/integration/E2E/CI | Real DB/Redis/browser |
| 17 | docs: document phase three delivery and validation | README/API/progress | Lint/type/build/tests |

## Business boundaries

Only approved organization members can create events. Organizer reads/writes are
scoped to membership; ADMIN reviews separately. Draft/rejected events can be edited;
submitted/published events cannot silently change approved details. Submission
requires future valid event/sales dates, enabled seats and matching prices. Every
important change and decision writes an audit entry in the same transaction.

Serialize event lifecycle and grid changes with a PostgreSQL event row lock.
Regeneration is all-or-nothing and blocked by orders, sold/held seats or hold history.
Seat availability toggles are conditional and never change SOLD/HELD inventory.
Public snapshots count only valid holds, expose PUBLISHED events, hide identities
and include revision. Do not claim booking/Socket.IO is implemented in this phase.

## Demo and verification

Organizer creates a draft and venue, generates VIP/Standard rows, assigns staff,
submits; admin inspects details/history then approves/rejects; customer finds only
published events and views ticket types/availability. Use actual PostgreSQL/Redis
test services and browser calls, without mocked business APIs. Report exact results
and limitations in progress; the commit plan may be adjusted for coherent groups.
