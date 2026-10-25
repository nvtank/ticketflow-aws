# Database — Phase 6

PostgreSQL 17 / Prisma 7.10.1 với PrismaPg adapter. Schema tại
`apps/api/prisma/schema.prisma`; migration đầu tại
`apps/api/prisma/migrations/20261022000000_initial/migration.sql`.
`pnpm db:migrate` chạy migrate deploy; `pnpm db:seed` tạo dữ liệu development/test.
Tạo migration mới bằng Prisma migrate dev, review SQL và không sửa migration đã áp dụng.

## Models

- User → UserSession → RefreshToken: session ổn định có hard expiry/revocation,
  mỗi refresh token hash chỉ consume một lần. Replay thu hồi session.
- Organization → OrganizationMember/User, Event → Venue.
- Event → TicketType, EventSection → Seat. Composite FKs bảo vệ cùng event.
- SeatHold → Seat; Order → OrderItem → Ticket → CheckIn.
- Payment/WebhookEvent có unique provider references/idempotency.
- EventStaffAssignment, WaitingRoomSession, Notification và AuditLog chuẩn bị cho phase sau.

21 models, UUID, tiền integer VND, UTC timestamptz. Code ghế unique trong event.
Composite keys gắn ticket với đúng order item/seat. FK không thay thế kiểm tra quyền.
Migration có CHECK email chuẩn hóa, giá/tổng tiền không âm, thời gian hợp lệ,
grid dương, HELD tương đương holdId khác null. Partial unique Ticket.seatId khi
VALID/USED ngăn nhiều vé hiệu lực cho một ghế; unique orderItemId/checkIn.ticketId.

## Auth transactions

Register tạo user/session/token/audit nguyên tử; unique email xử lý đăng ký đồng thời.
Hash password ngoài transaction. Login/password change khóa user; refresh khóa user
rồi session theo cùng thứ tự, consume token và tạo token mới nguyên tử. Replay trả
thất bại sau khi transaction commit revocation, tránh rollback mất thu hồi.
Logout thu hồi session; đổi mật khẩu thu hồi tất cả sessions. JWT được kiểm tra với
session, isActive và role hiện tại trong DB mỗi request.

## Seed và test

Seed tạo 5 users, 1 organization, 3 events, 300 seats, 1 PAID order, 2 tickets/check-in
mẫu trong transaction. Ngày tương đối lúc tạo đầu tiên; chạy lại giữ ngày, mật khẩu
và SOLD inventory. QR mẫu chỉ lưu hash, chưa phải luồng phát hành QR.
Seed đã chạy hai lần và kiểm tra row counts bằng psql. Test stack riêng 55432/56379,
PostgreSQL tmpfs; 14 auth integration tests đã chạy với DB/Redis thật.

## Các bước sau schema Phase 2

Schema Phase 2 mới chuẩn bị quan hệ. Phase 4 đã triển khai hold bằng conditional
update/row locks sorted seat IDs, rollback cả nhóm, server TTL/reconciliation không
giải phóng SOLD và ownership checks; xem phần bên dưới. Phase 5 finalization cần
atomically kiểm tra payment, hold/expiry,
sale/ticket/order; callback trễ cần refund, không chiếm ghế đã bán. Check-in phải
kiểm tra staff assignment và conditional VALID → USED. Chưa kiểm thử concurrency
đặt ghế/check-in ở Phase 2.

## Phase 3 migration and transactions

`20261022010000_event_catalog` adds Event.galleryUrls (text array, empty default),
Venue.city and TicketType(eventId, priceVnd) indexes. Applied to development and
isolated test databases. Prices remain integer VND and all timestamps UTC.

Event rows are locked with parameterized `SELECT ... FOR UPDATE` before content,
grid, submit, approve/reject or assignment mutations. Approval and a competing
rejection cannot both succeed. Grid generation/deletion is atomic and blocked by
orders/hold history/occupied seats. Conditional seat configuration changes cannot
turn SOLD/HELD into AVAILABLE. Lifecycle writes and audit records commit together.
Draft deletion retains an AuditLog tombstone without a foreign key to deleted event.

Editing creates a new venue row to avoid mutating venues shared by other events.
Unused old venue rows are retained for now; no automatic venue cleanup is implemented.
Public snapshots use repeatable read; effective held availability uses server time.
Public catalog filters use parameterized SQL and escape wildcard search characters.
Organizer aggregates count PAID order revenue and SOLD seats within membership scope.

## Phase 4 reservation invariants

`20261023000000_reservation_retries` adds nullable user-scoped unique retry key,
immutable requestedSeatIds UUID array and active-hold query index. Migration
backfills requested seats from existing seat relations and order items. Seed now
populates requested IDs for the sample paid order. Hold history survives release.

Lock order is event FOR KEY SHARE → user/event advisory lock → sorted canonical
seat UUID rows FOR UPDATE → hold/order. Event KEY SHARE protects configuration
against Phase 3 exclusive edits without shared-lock upgrade deadlocks between
competing buyers; revision-only updates use PostgreSQL's non-key update lock.
PostgreSQL clock is read after seat locks; network/Redis calls are outside transactions.

Conditional group update accepts AVAILABLE or expired/released HELD seats only.
Mismatch rolls back hold, seat writes, audit and revision together. Unique retry
keys resolve concurrent attempts; same-user active holds are serialized. Expired
old holds cannot reclaim seats taken by a newer hold. Order items copy authoritative
prices and expire with the original hold. Partial tickets/payments are not issued.

Reconciliation scans at most 100 expired unreleased holds per run, locks their
original seat IDs, only updates seats still HELD by that exact hold, expires pending
orders, and never changes SOLD/PAID. Multiple reconcilers safely repeat the same work.
Effective expiry is checked at every mutation and snapshot, independent of cleanup.

Real integration coverage includes 100 different authenticated customers racing via
HTTP, overlapping opposite-order groups, rollback, early sale end, key races,
ownership, reload recovery, order retry/pricing and SOLD cleanup safety. This is
correctness evidence, not a throughput/capacity benchmark.

## Phase 5 payment sessions and credentials

Migrations 20261023010000_payment_sessions and 20261023020000_payment_settlement_refs
were applied to development/test PostgreSQL. Payment stores a unique safe-integer
providerOrderCode, unique retry UUID, checkout URL, original expiry/reconciliation
clock, mock-only due/outcome and settled transfer references. No channel secrets or
raw ticket credentials are stored in database rows. Unique(orderId, provider) plus
order locks/service checks prevent another provider attempt on the same order.

Ticket qrVersion=1 indicates a reproducible signed opaque credential; its hash is
stored. Existing version-zero rows remain historical unless explicitly upgraded
by the seed for its two known demo codes. WebhookEvent stores normalized payload
hash, payment ID, outcome and processed time; unique provider/reference serializes
callbacks. A ticket uniqueness error rolls back all inventory/order/payment/webhook
writes and permits a safe retry after the underlying inconsistency is repaired.
Extra distinct transfers are tracked for refund review without revoking valid
existing tickets. The partial unique active-ticket/seat index remains unchanged.

## Phase 6

Migration 20261023030000_attendance_reporting adds Event.checkInRevision and indexes
CheckIn.createdAt / Order(status,paidAt), applied to development/test. Admission
locks event KEY SHARE, staff user SHARE, then ticket FOR UPDATE. Assignment removal
and event changes take event UPDATE locks; account locks take user UPDATE locks.
VALID -> USED, unique CheckIn(ticketId), staff/time/audit/revision commit together.
A second concurrent confirm sees USED and returns 409. Verify does not mutate.

## Phase 7

Migration `20261023040000_waiting_capacity` adds Event.waitingRoomCapacity default20
and CHECK 1–500. Existing WaitingRoomSession unique(eventId,userId) holds stable
identity/activity timestamps; Redis owns lease status and expiry enforcement.
Notification uses indexed (userId,readAt,createdAt) for owned paginated receipts;
mark-read updates only unread owned rows, preserving the first read timestamp.

## Google identities

Migration `20261023050000_google_identity` makes User.passwordHash nullable for
Google-only accounts and adds ExternalIdentity with unique(provider,subject) and
unique(userId,provider). Identity creation and session issuance share one transaction.
Existing passwords/users are preserved. Subject is authoritative; matching an email
never silently attaches a Google identity. Deleting a user cascades its identities.

## Discovery extension

Additive migration `20261024010000_discovery_reviews` introduces:

- `Artist`: uniquely addressed public profiles with explicit publication and demo
  flags; no fabricated real-person biographies or profile photos.
- `EventArtist`: many-to-many links, composite primary key, cascading relation
  cleanup. Public reads expose only approved published event links.
- `EventReview`: unique `(eventId, authorId)`, ticket purchase proof, score/comment,
  UTC created/updated timestamps. Foreign keys cascade on fixture cleanup; rating
  and trimmed comment length have PostgreSQL CHECK constraints as well as DTO
  validation. No QR or provider credentials stored in reviews.

Existing seat, hold, order, payment, ticket and authentication columns are preserved.
`db:seed:discovery` only upserts labelled fictional artist profiles and missing links
to existing demo music events. It never modifies sold seats or seeds customer reviews.
