# Database — Phase 3

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

## Invariants cần triển khai Phase 4–6

Schema chưa thực thi quy trình bán vé. Cần hold bằng conditional update/row locks
sorted seat IDs, rollback cả nhóm, server TTL/reconciliation không giải phóng SOLD,
và ownership checks. Finalization phải atomically kiểm tra payment, hold/expiry,
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
