# Tiến độ TixFlow

Cập nhật: 23/10/2026, múi giờ Asia/Ho_Chi_Minh. Timeline 20/09–22/10 trong đề bài là
kế hoạch. Theo yêu cầu thay đổi ngày 23/10, author/committer dates đã được mô phỏng
theo timeline, giữ nguyên source và danh tính. Lịch sử gốc nằm trên các nhánh
`archive/real-20261023/...`; xem [commit-timeline.md](commit-timeline.md).
Các kết quả kiểm tra dưới đây ghi thời gian chạy thực tế. Các hash Phase 1–3
trong báo cáo bàn giao cũ là hash gốc, vẫn tra được trên nhánh archive.

## Phase 1 — Project Setup & Design System

**Phase 1 hoàn tất. Docker startup được xác minh bổ sung trong Phase 2 ngày
22/10/2026. Chưa tuyên bố MVP bán vé hoàn thành.**

Phụ trách: `hoangphatdev`. Người dùng đã xác nhận author
`hoangphatdev <latruonghoangphat@gmail.com>`. Tổng cộng 17 commit có nội dung thực
khi bao gồm commit tài liệu cuối. Branch: `feature/phase-1-foundation`.
`main`/`develop` giữ baseline kế hoạch `4d7bee4`. Cả ba branch đã push;
[PR #2](https://github.com/nvtank/ticketflow-aws/pull/2) đã merge vào develop (cập nhật Phase 3).
Phase 1 có commit cuối thực tế `88a6bfa`.

### Đã triển khai

- pnpm workspace, shared package, TypeScript strict, ESLint/Prettier, lockfile và CI config.
- Next.js App Router + NestJS modular foundation. Shared types/constants cho các phase sau.
- PostgreSQL/Redis Compose, volume bền vững, healthcheck, loopback ports, env example.
- REST `/api/v1`, Swagger, Helmet, CORS whitelist, ValidationPipe, rate limit,
  request ID, log không chứa credentials và exception format nhất quán.
- Liveness, readiness bằng PostgreSQL query/Redis PING và HTTP metrics đo thực tế.
- Design tokens Indigo/Violet/Cyan, Inter tự phục vụ, UI components theo shadcn/Radix,
  focus/keyboard support, skeleton, toast, lỗi/rỗng và 404.
- Landing tiếng Việt với đồ họa sân khấu vector gốc; public header/footer, menu mobile.
- Nền tảng discovery nối REST và search URL; thông báo rõ Event API chưa triển khai.
- Organizer/Staff/Admin dashboard layout previews, không có số liệu kinh doanh giả.
- Query provider, Zod response validation và Zustand navigation state.

### Kết quả chạy thực tế

| Kiểm tra                           | Kết quả                                                                |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `pnpm install` với strict peers    | PASS sau override tương thích schema-utils                             |
| `pnpm lint`                        | PASS, 0 warnings/errors                                                |
| `pnpm typecheck`                   | PASS: shared, API source/tests, web và root test/config files          |
| `pnpm format:check`                | PASS                                                                   |
| `pnpm build`                       | PASS: shared, NestJS và Next.js production build, 7 application routes |
| `pnpm test`                        | PASS: 18 tests, 2 files                                                |
| Playwright Chromium                | PASS: 18/18, desktop và mobile, không mock API responses               |
| Compose `config --quiet`           | PASS với Compose CLI 2.39.4 và `.env.example`                          |
| PostgreSQL/Redis container startup | PASS bổ sung 22/10: development và test stacks healthy                 |
| GitHub Actions                     | Config đã push; chưa kiểm tra kết quả CI remote                        |
| Transaction/concurrency tests      | Chưa thuộc Phase 1, chưa chạy                                          |

Lần E2E cuối: 18 passed trong 54.9s. Lần `pnpm test` cuối: 18 passed trong
32.67s (thời gian Vitest, không bao gồm build). Đây không phải benchmark tải.

Môi trường ban đầu không có Node/pnpm/Docker CLI trong PATH. Node 24.22.1 được tải
và xác minh SHA-256, pnpm 10.34.1, Compose CLI và Chromium được chuẩn bị trong `/tmp`.
Ba thư viện Chromium thiếu được tải từ Ubuntu và giải nén riêng trong `/tmp`, không
sửa thư viện hệ thống. Các tiến trình test API/web tự dừng sau Playwright.

Lần build Next đầu trong sandbox lỗi vì subprocess `tsc --showConfig` trả stdout
rỗng; build ngoài sandbox đã pass. E2E ban đầu bị chặn bởi thư viện Chromium thiếu;
sau khi chuẩn bị runtime, 16/18 pass. Hai test browser history cần chờ URL điều hướng
thứ hai hoàn tất trước khi Back; đã sửa và cả 18 pass. Không che giấu các lần lỗi này.

### Giới hạn và bước tiếp theo

1. Đã bổ sung: cài Docker Engine trong WSL, Compose healthy và `/system` báo kết nối
   PostgreSQL/Redis qua E2E thật. Xem kết quả Phase 2 bên dưới.
2. Phase 2 đã triển khai và kiểm thử: xem phần cập nhật bên dưới.
3. Phase 3: event CRUD/approval, organization ownership và seat grid generator.
4. Phase 4 ưu tiên transaction/concurrency trước realtime; phải kiểm thử thật 20/100
   requests, atomic multi-seat, expiration và ownership trên database/Redis test.
5. Các phase payment, ticket QR, atomic check-in, analytics và waiting room chưa triển khai.

Không có migration/seed giả, endpoint booking giả, doanh thu hardcode hoặc đánh giá
khả năng phục vụ 1.000 người. Dashboard là public previews lúc bàn giao Phase 1;
Phase 2 đã bảo vệ bằng đăng nhập/role backend và frontend.

### Lịch sử commit

Kế hoạch atomic commits: [phase-1-plan.md](phase-1-plan.md).
Danh sách đầy đủ bao gồm commit tài liệu chứa file này được lấy từ Git:

```sh
git log --reverse --format='%h %s' archive/real-20261023/feature/phase-1-foundation
git rev-list --count archive/real-20261023/feature/phase-1-foundation
```

Các commit đã tồn tại trước commit tài liệu cuối:

```text
4d7bee4 docs: record phase one delivery and commit plan
7a3e95d chore: initialize pnpm workspace and repository tooling
ee20db2 chore(config): add strict TypeScript and quality configuration
10f2343 feat(shared): define platform constants and API contracts
631554f chore(infra): configure local PostgreSQL and Redis
b2136be feat(api): bootstrap modular NestJS application
b22e638 feat(api): standardize validation errors and request logging
64c01d8 feat(api): add dependency health and request metrics
d51f1f6 feat(web): initialize Next.js App Router application
ac34001 feat(ui): implement accessible design system primitives
e6354b1 feat(web): configure query state and notification providers
b662182 feat(web): build responsive public navigation and footer
e206cf5 feat(web): create discovery landing and honest empty states
5b77aec feat(web): add responsive role dashboard layouts
aae2f1d feat(web): add application loading and error boundaries
8a02334 test: verify API foundation and responsive application shells
```

Commit tài liệu cuối dùng message `docs: document local setup architecture and phase results`;
hash thực tế được báo trong kết quả bàn giao và `git log` sau commit.

## Phase 2 — Database & Authentication

Phụ trách được người dùng chuyển từ nguyen-van-hoan sang **nvtank**, author đã xác
nhận `nvtank <tuannguyen.120910@gmail.com>`. Branch `feature/phase-2-auth` dựa trên
Phase 1 `88a6bfa` trong lúc PR #2 chờ review. Cập nhật Phase 3: Phase 2 đã push và
[PR #4](https://github.com/nvtank/ticketflow-aws/pull/4) đã merge vào develop tại `16f6146`. Kế hoạch
17 atomic commits; ban đầu dùng timestamp thực tế, đã tái dựng theo chính sách mới ở trên. Xem [phase-2-plan.md](phase-2-plan.md).

### Đã triển khai

- Prisma 7.10.1, 21 models, UUID/FK/index/composite keys, integer VND/UTC,
  SQL CHECK và partial unique index cho vé hiệu lực mỗi ghế.
- Migration thật trên development/test PostgreSQL; seed idempotent 5 accounts,
  organization, 3 future events, 300 seats, 1 paid order, 2 sample tickets.
- Bcrypt cost 12, min 12 characters/max 72 UTF-8 bytes, normalized unique email.
- AuthProvider abstraction, access JWT HS256 issuer/audience/type/expiry;
  session/revocation/account activity và role xác minh từ DB mỗi request.
- Refresh token random/hash-only, HttpOnly SameSite cookie, atomic rotation,
  replay revocation commit, hard session age; logout thu hồi, password change thu hồi mọi phiên.
- Backend default-deny/RBAC, membership-scoped organization reads, CSRF origin checks,
  stricter per-endpoint throttling, safe DTOs/no privilege escalation.
- Login/register tiếng Việt, memory-only session, cross-tab refresh coordination,
  protected workspaces, profile/password forms, logout, private query cache clearing.
- Dedicated real test DB/Redis Compose, guarded migration scripts, Vitest/Playwright/CI.

### Docker cài và bật thực tế

Theo yêu cầu người dùng, đã cài Docker Engine từ apt repository chính thức trong
WSL Ubuntu 26.04 có systemd; không cài AWS resources. Docker Engine **29.9.2**,
Compose **5.6.1**, containerd **2.4.2**. Docker service `active` và `enabled`.
User nvtank thuộc docker group, đã chạy Compose không sudo qua phiên WSL mới.
Terminal mở trước đó cần mở lại hoặc `newgrp docker` để nhận group mới.

Development PostgreSQL 5432/Redis 6379 và test 55432/56379 đều healthy. Các containers
vẫn chạy khi bàn giao. Dev stack có restart unless-stopped; test stack cần bật lại
sau khi dừng WSL. Kiểm tra trực tiếp psql sau seed hai lần: **5 users, 3 events,
300 seats, 1 order, 2 tickets**. Redis trả PONG. Health E2E xác nhận cả ba kết nối.

### Kết quả thực tế

| Kiểm tra                     | Kết quả                                                  |
| ---------------------------- | -------------------------------------------------------- |
| Prisma validate/generate     | PASS                                                     |
| Dev và test migrations       | PASS, migration applied                                  |
| Seed hai lần + psql counts   | PASS, không nhân đôi dữ liệu                             |
| Lint                         | PASS, zero warnings                                      |
| Typecheck                    | PASS, API/web/shared/tests/config                        |
| Format check                 | PASS, Prettier toàn repository                           |
| Production build             | PASS, Next/Nest/shared; 9 application routes + not-found |
| Unit/HTTP Vitest             | PASS 30/30, 3 files; 59.24s                              |
| PostgreSQL/Redis integration | PASS 14/14; 34.57s                                       |
| Authentication E2E           | PASS 4/4, desktop/mobile; 50.8s                          |
| Foundation E2E               | PASS 20/20, desktop/mobile; 55.0s                        |

Integration kiểm tra duplicate registration, cả 4 role, cross-organization denial,
refresh replay và rotation đồng thời, session expiry/logout, profile/password và
locked users trên database thật. E2E kiểm tra cookie HttpOnly/no browser storage,
hai tab reload, đổi mật khẩu/thu hồi phiên, đăng nhập lại và đăng xuất.

Ban đầu migration/seed/integration bị chặn bởi Docker chưa cài hoặc sandbox không
truy cập được cổng local; không dùng mock thay thế. Sau khi cài Docker và chạy với
quyền mạng local phù hợp, migration/seed/tests pass. E2E lần đầu 2/4 pass do profile
và AuthGate cùng điều hướng login sau đổi password; đã bỏ điều hướng trùng và cả
4 pass. Prettier phát hiện 4 file chưa format, đã chỉnh và kiểm tra lại trước commit.

### Giới hạn và Phase 3

- Chưa có event CRUD/approval/list API dù seed đã có event rows. Dashboard không có KPI giả.
- Chưa có booking/realtime/payment/QR issuance/check-in/analytics/waiting room services.
  Schema và vé mẫu không đồng nghĩa các nghiệp vụ đó hoàn tất.
- Chưa chạy concurrency seat holds 20/100 requests hoặc load benchmark.
- Rate limiter hiện là per-process memory; chưa có distributed limiter.
- Refresh Web Locks cần browser hỗ trợ; duplicate concurrent refresh ở client khác
  fail closed và có thể yêu cầu login lại.
- Chưa có reset email/OAuth; chưa kiểm tra kết quả GitHub Actions của Phase 2.
- Phase 3: organization-scoped Event CRUD, draft/submit/admin approve, venue và seat
  grid generator, public event listing/details; giữ bảo vệ seat/order khi inventory thay đổi.

Lấy lịch sử commit Phase 2 thực tế (kể cả commit tài liệu chứa file này):

```sh
git log --reverse --format='%h %s' 88a6bfa..archive/real-20261023/feature/phase-2-auth
git rev-list --count 88a6bfa..archive/real-20261023/feature/phase-2-auth
```

Các commit đã tồn tại trước commit bàn giao cuối:

```text
6c98b87 docs: record phase two database and authentication plan
bfcae9e chore(auth): configure Prisma and secure local authentication environment
c8bcdf9 feat(db): model identity event inventory orders and tickets
1826e8f feat(db): enforce relational inventory and session constraints
f6bb0b7 feat(db): manage Prisma PostgreSQL client lifecycle
5560f86 feat(db): seed repeatable demo accounts and numbered inventory
016cf29 feat(auth): implement bcrypt password and session backed JWT provider
a556770 feat(auth): implement registration login and atomic refresh rotation
21f524e feat(auth): expose validated authentication with secure refresh cookies
e25c2ce feat(auth): enforce backend roles and organization membership
7ef94a2 feat(users): manage profiles and revoke sessions on password change
0698970 feat(web): manage memory only sessions and coordinated token refresh
75928e2 feat(web): implement Vietnamese login and registration forms
8e366ee feat(web): protect role workspaces and support profile management
3484a57 test(auth): verify password JWT and authorization policies
585c51d test(auth): verify real database sessions and browser authentication
```

Commit bàn giao cuối chứa README/API/database/progress và chỉnh nhãn bản local;
hash của chính commit đó lấy bằng `git log -1` sau khi commit. Không tự ghi hash
của một commit chưa tồn tại.

## Phase 3 — Event Management

Phụ trách/author theo xác nhận mới của người dùng:
**nguyen-van-hoan <nguyenvanh842k5@gmail.com>**. Branch `feature/phase-3-events`,
base develop `16f61469c6ea2943451f179207eef89461db96ed`. Xem
[commit breakdown](phase-3-plan.md). Author giữ nguyên; ngày commit đã tái dựng theo chính sách mới ở trên.

### Đã triển khai

- Migration gallery URLs/indexes áp dụng trên PostgreSQL development và test.
- Organizer tạo/sửa/xóa nháp thuộc tổ chức, nhập địa điểm/ảnh/chính sách/lịch bán,
  lọc/phân trang trạng thái, gửi duyệt và sửa bản bị từ chối.
- Generator 1–8 khu, giá integer VND, 1–26 hàng × 1–40 cột/khu, tối đa 2.000 ghế.
  Tạo lại nguyên tử; khóa khi có đơn hàng/lịch sử giữ ghế. Không bật/tắt SOLD/HELD.
- Gán/gỡ STAFF đang hoạt động theo từng sự kiện; không cấp quyền mọi sự kiện.
- ADMIN xem hàng chờ/chi tiết, duyệt hoặc từ chối có lý do, xem lịch sử audit.
  Event row lock tuần tự hóa các quyết định và thay đổi grid/submit cạnh tranh.
- Danh mục công khai chỉ lấy PUBLISHED từ tổ chức đã duyệt; tìm tên, lọc danh mục,
  địa điểm/ngày/giá, sắp xếp, phân trang và đồng bộ URL. Trang chi tiết có giá/tồn ghế.
- Snapshot public có revision/serverTime, không lộ user/hold IDs; hold hết hạn được
  phản ánh khả dụng. Chưa có endpoint giữ ghế hay Socket.IO trong phase này.
- KPI Organizer lấy từ DB theo membership: sự kiện, đang bán, SOLD inventory,
  doanh thu PAID và tỷ lệ lấp đầy. Giao diện có skeleton/error/retry/empty/toast/modal.
- Swagger schemas được sinh bằng Nest CLI plugin; DTO/guards/audit và REST thật.
- Unit, integration PostgreSQL/Redis và E2E browser cho vòng đời sự kiện; CI thêm suite events.

### Kết quả kiểm tra thực tế

**Phase 3 hoàn tất.** Các kiểm tra cuối ngày 23/10/2026:

| Kiểm tra                                              | Kết quả                                          |
| ----------------------------------------------------- | ------------------------------------------------ |
| Lint / typecheck / Prettier                           | PASS toàn repository                             |
| Production build                                      | PASS shared/Nest/Next, 15 app routes + not-found |
| Unit/HTTP (22/10)                                     | PASS 46/46, 4 files, 158.39s                     |
| PostgreSQL/Redis integration (22/10)                  | PASS 36/36, 14 auth + 22 events, 138.72s         |
| Event integration sau bổ sung rollback/literal search | PASS 22/22, 89.95s                               |
| Event E2E (23/10)                                     | PASS 2/2 desktop/mobile, 1.3m                    |
| Auth E2E (23/10)                                      | PASS 4/4 desktop/mobile, 58.2s                   |
| Foundation E2E (23/10)                                | PASS 20/20 desktop/mobile, 1.1m                  |
| Test DB migrations sau khởi động lại (23/10)          | PASS cả hai migrations                           |
| Development/test PostgreSQL + Redis                   | Healthy; readiness E2E xác nhận kết nối          |

Thời gian trên gồm import/startup, không phải benchmark. Không mock REST responses
hoặc database/Redis trong integration/E2E. Foundation suite cố ý dùng các dependency
ports đóng để kiểm tra error UX; các log API lỗi của suite đó là tình huống kiểm thử.
Ảnh E2E thật lưu tại `test-results/phase-3-verified`, console logs tại `.local/*-e2e.log`
(Git ignore). Không ghi credentials/token vào báo cáo.

Các integration tests mới xác minh: private drafts, RBAC/cross-organization,
validation, venue isolation, grid 200 ghế, rollback, seat toggle/revision,
active staff/uniqueness, submit freeze, rejection/correction, concurrent review
(one 200/one 409), public price filters/pagination, privacy, expired holds,
sold inventory, real aggregates, safe delete/audit và grid/submit race.

### Giới hạn và Phase 4

- CRUD chỉ cho DRAFT/REJECTED; pending/published bị khóa. Chưa có hủy/kết thúc sự kiện
  và chính sách thay đổi sự kiện đã bán. PATCH nội dung yêu cầu bộ trường đầy đủ.
- Ảnh dùng URL, chưa có upload. Venue cũ không còn tham chiếu được giữ lại, chưa cleanup.
- Biểu đồ doanh thu, đơn hàng mới, analytics chi tiết và tổng quan toàn hệ thống Admin
  chưa thuộc lần bàn giao này; Phase 6 sẽ bổ sung. STAFF workspace chưa có check-in.
- Public availability là snapshot. Booking/hold TTL/reconciliation/realtime/payment/QR
  và waiting room chưa triển khai. Chưa chạy 20/100 concurrent seat holds hoặc load test.
- Phase 4 tiếp theo: reservation atomic theo sorted seat IDs, TTL 300s/ownership,
  release/reconciliation, Socket.IO sau commit, resync/revision và concurrency tests thật.
- Redis hiện phục vụ readiness; chưa dùng làm cache hoặc reservation authority.
- Chưa xác nhận CI remote cho Phase 3; kết quả tại đây là kiểm tra local.

Lỗi môi trường đã xác minh: Node copyfile ghi vào ổ Windows `/mnt/d` trả EPERM
(kể cả build sạch); read/write thường vẫn được. Chuyển `.next` sang filesystem
Linux trong `/tmp` qua symlink đã build thành công. Kết quả Playwright cũng dùng
`/tmp` vì trace/report copyfile gặp cùng lỗi; không sửa source framework.
E2E đầu phát hiện label bao quanh select bị ghép text của options vào accessible name;
đã tách label bằng htmlFor/id và chạy lại. Không che giấu lần kiểm tra thất bại.

Phiên làm việc 23/10 mất `/tmp` và test containers dừng; đã khôi phục Node 24.22.1
(kiểm SHA256), pnpm 10.34.1, Chrome headless chính thức (kiểm ZIP CRC), các thư viện
browser và áp dụng lại migrations DB test. Archives cache nằm trong `.local` bị Git
ignore. Sau E2E đã chép build về `.next` thường để tránh symlink treo khi `/tmp` mất.

Driver pg/Prisma hiện phát cảnh báo query concurrency sẽ thay đổi ở pg 9; tests
hiện tại với phiên bản đã khóa vẫn pass. Cần theo dõi adapter trước khi nâng major.

### Lịch sử commit Phase 3

16 commit đã tồn tại trước commit bàn giao cuối:

```text
29861f0 docs: record phase three event management plan
8963913 feat(shared): define event lifecycle and inventory contracts
fefdb13 feat(db): store event galleries and catalog indexes
a58b3c4 feat(events): validate event schedules and seat grid configuration
601447b feat(events): manage organization scoped drafts and safe deletion
5fbb5cc feat(seats): generate atomic grids and protect sold inventory
d9ba9fe feat(events): serialize submissions and audited review decisions
d9867d7 feat(events): expose filtered published catalog and inventory
d3b5059 feat(organizer): expose event management and staff assignments
75511ce feat(admin): wire event review APIs and Swagger schemas
6ee8ebe feat(web): browse real events with URL filters and details
d6406bf feat(web): show organizer event lists and real sales overview
9a11d51 feat(web): create and edit event drafts with validated forms
0992f23 feat(web): manage event seat grids staff and audit history
acd5f99 feat(web): review and publish events in admin workspace
75cfcd8 test(events): verify lifecycle ownership inventory and browser workflows
```

Commit bàn giao cuối dùng message `docs: document phase three delivery and validation`.
Lấy toàn bộ lịch sử và số lượng thực tế (bao gồm chính commit tài liệu này):

```sh
git log --reverse --format='%h %s' 16f6146..archive/real-20261023/feature/phase-3-events
git rev-list --count 16f6146..archive/real-20261023/feature/phase-3-events
```

Danh sách hash/message cuối được xuất từ Git tại `test-results/phase-3-commits.txt`
sau commit bàn giao, không tự tạo hash cho commit chưa tồn tại. Cập nhật Phase 4:
[PR #5](https://github.com/nvtank/ticketflow-aws/pull/5) đã merge vào develop và
[PR #6](https://github.com/nvtank/ticketflow-aws/pull/6) đã merge develop vào main
trên GitHub. Đợt tái dựng bảo toàn hai merge này; không có merge tự động từ agent.

## Phase 4 — Booking & Realtime

Phụ trách/author đã xác nhận: **nvtank <tuannguyen.120910@gmail.com>**.
Branch `feature/phase-4-booking-realtime`, base Phase 3 đã tái dựng `ff4c12b`.
Kế hoạch 20 atomic commits: [phase-4-plan.md](phase-4-plan.md).
Ngày author/committer mô phỏng 04–10/10/2026; các lần kiểm tra bên dưới chạy thực
ngày 23/10/2026. Không dùng ngày mô phỏng làm bằng chứng thời gian thực hiện.

### Đã triển khai

- Migration retry keys + immutable requestedSeatIds; đã áp dụng development/test.
  Seed tiếp tục giữ SOLD inventory, điền requested IDs cho đơn mẫu.
- Hold PostgreSQL nguyên tử, DB clock/TTL tối đa 300 giây và không quá giờ đóng bán;
  lock theo thứ tự ổn định, kiểm tra event/org/sales/giới hạn trước cập nhật có điều kiện.
  Nhóm ghế rollback toàn bộ khi xung đột. Một active hold/customer/event.
- Retry giữ ghế/checkout có key, không gia hạn hoặc tạo bản ghi trùng; retry key dùng
  đồng thời cho hai event trả một thành công/một 409, không lộ lỗi unique constraint.
- Chỉ chủ hold được xem/hủy; thu hồi và cleanup chỉ tác động HELD đúng hold, không
  giải phóng SOLD. Ghế hết hạn được giữ lại ngay trước khi scheduler dọn.
- Snapshot nhất quán, trạng thái riêng HELD_BY_ME/HELD_BY_OTHERS, revision/serverTime,
  khôi phục hold/order sau reload; không lộ thông tin người giữ khác.
- Order pending do server tính giá, item copy giá server, cùng expiry với hold,
  chỉ chủ được xem/hủy, lịch sử có phân trang và trạng thái hết hạn thực tế.
- Socket.IO xác thực JWT/session/Origin, room theo public event, private order room
  lấy từ principal; chỉ phát hint sau commit. Redis adapter tùy cấu hình, đã chạy
  hai backend thật. Không chờ Redis trong database transaction.
- Seat map tương tác, sân khấu/khu/hàng, legend/trạng thái, chọn tối đa theo event,
  zoom/cuộn ngang mobile, toast/error/skeleton, xác nhận hủy và countdown server.
  Reconnect/revision invalidation + REST định kỳ; selection khác quyền giữ ghế.
- Tách việc tải sự kiện booking sau xác minh phiên để không kẹt cache khi reload.
  E2E ban đầu phát hiện lỗi này; đã sửa và chạy lại đạt, không bỏ assertion realtime.
- Checkout pending và lịch sử đơn thật tại profile. Chưa có nút thanh toán giả.
- Metrics đo hold successes/failures, current sockets và DB valid-held seats; không
  giả dữ liệu khi DB mất kết nối. Config/Swagger/API docs, CI booking E2E cập nhật.

### Kiểm tra thực tế ngày 23/10/2026

**Phase 4 hoàn tất; chưa phải toàn bộ MVP.** Tổng cộng 20 commit có nội dung thực
khi gồm commit bàn giao cuối. PostgreSQL test 55432/Redis 56379 là dịch vụ thật.

| Kiểm tra             | Kết quả thực tế                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Lint                 | PASS, không warnings/errors                                                                   |
| Typecheck            | PASS shared/API source + tests/web/root configs                                               |
| Prettier             | PASS toàn repository; cache/runtime local được ignore                                         |
| Production build     | PASS shared/NestJS; Next.js build cuối compile 12.0s, TypeScript 18.9s, 17 application routes |
| Unit/HTTP            | 64/64, 6 files, 121.76s                                                                       |
| Integration cuối     | 55/55, 4 files, 141.54s                                                                       |
| Foundation E2E       | 20/20, desktop/mobile, 58.5s; cố ý tắt DB/Redis để kiểm tra lỗi                               |
| Auth E2E             | 4/4, desktop/mobile, 55.3s                                                                    |
| Event management E2E | 2/2, desktop/mobile, 1.1 phút                                                                 |
| Booking E2E          | 2/2, desktop/mobile, 1.5 phút; hai khách thật/context riêng                                   |
| Timeline integrity   | 60/60 cặp tree/author/committer identity khớp; 5 backup refs được xác minh trên GitHub        |

55 integration cases gồm auth 14, event management 22, booking 14, realtime 5.
Booking chứng minh 20 và 100 HTTP requests đồng thời chỉ có một hold cho một ghế,
nhóm ghế atomic, tranh nhóm ngược thứ tự không deadlock, expiry/reclaim, khác chủ
bị từ chối, key retries, giá server, order expiry và cleanup không giải phóng SOLD.
Realtime qua hai backend/Redis kiểm tra JWT/Origin/room, sau commit, rollback không
phát hint, privacy/private order room, reconnect snapshot và metrics.

28 E2E cases không mock REST. Booking kiểm tra giới hạn 4 vé, nhận cập nhật dưới
4 giây (ngắn hơn polling 10 giây), reload khôi phục hold/countdown, tổng đơn
4.800.000 VND, hủy trả ghế realtime và từ chối xem đơn khách khác. Screenshot
mobile kiểm tra không tràn viewport. Không suy ra năng lực tải production từ các
kiểm tra này; chưa kiểm thử callback/check-in.

Một cảnh báo pg@8 về query đồng thời trên cùng connection xuất hiện ở luồng
seat generator Phase 3 (`Promise.all` trong transaction); tests vẫn đạt. Cần tuần tự
hóa các query đó trước nâng pg@9. Phase 4 lock/reservation không dùng mẫu này.
Log local: `.local/phase-4-*.log`, `.local/booking-e2e.log`; screenshot tại
`test-results/phase-4-verified/` (ignored). Build `.next` được đưa về thư mục thường
trong workspace sau E2E để không phụ thuộc symlink `/tmp`.
Kết quả GitHub Actions chỉ được xác nhận sau khi workflow remote chạy.

### Giới hạn và Phase 5

- Chưa triển khai payment provider/callback, QR issuance hay atomic check-in. Không
  tạo vé khi frontend điều hướng. Phase 5 cần xử lý callback trùng/đến muộn và
  REFUND_REQUIRED trước khi có thể gọi đây là MVP bán vé hoàn chỉnh.
- Waiting room chưa triển khai; booking fail closed khi event bật waiting room.
- Socket hint không có durable outbox/replay; reconnect/polling REST bù mất thông
  báo. Không tuyên bố chống bot/fairness hoặc phục vụ 1.000 người đồng thời.
- Scheduler trong API quét tối đa 100 expired holds/lần. PostgreSQL quyết định
  khả dụng ngay cả khi cleanup chậm. Throttle/metrics hiện theo từng process.
- Redis adapter đã test hai instance, chưa benchmark tải hay Redis failover.
- Phase 5 kế hoạch phụ trách nguyen-van-hoan; cần xác nhận author nếu người dùng
  thay phân công, không tự gán email chưa được phép.

### Tái dựng lịch sử đã áp dụng

Người dùng đã duyệt bảng xem trước và yêu cầu áp dụng, giữ backup gốc. Năm refs
main/develop/feature Phase 1–3 đã cập nhật nguyên tử bằng force-with-lease sau khi
kiểm tra remote tips. Backup `archive/real-20261023/...` có trên GitHub. Hai merge
PR #5/#6 mới nhất được bảo toàn. Đối chiếu 60 commit: tree và author/committer
identity giống hệt bản gốc; chỉ dates/parent/hash/signature thay theo tái dựng.
Bảng đối chiếu đầy đủ: [commit-timeline-map.csv](commit-timeline-map.csv).
Chi tiết refs/chữ ký/thời gian thực: [commit-timeline.md](commit-timeline.md).

### Lịch sử commit Phase 4

19 commit đã tồn tại trước commit tài liệu bàn giao cuối:

```text
802d853 docs: record phase four reservation and realtime plan
f566267 chore(realtime): install compatible Socket.IO dependencies
1699fba feat(shared): define booking and realtime contracts
9a0c77c feat(db): persist reservation retry keys and requested seats
8b150ec feat(booking): validate sales and lock inventory consistently
e37ca35 feat(booking): reserve seat groups atomically
c6116cb feat(booking): release and reconcile expired holds
5f4408e feat(booking): expose authoritative customer snapshots
05c59b2 feat(orders): create server priced idempotent checkout orders
4ab5fee feat(realtime): authenticate event rooms and publish committed revisions
8d76892 feat(realtime): configure Redis adapter module and runtime options
8813c2f feat(api): wire reservation checkout and reconciliation endpoints
770adc5 test(booking): verify policies and stale snapshot handling
4099763 test(booking): prove concurrent PostgreSQL reservations and retry safety
63cfe16 test(realtime): verify committed rooms across Redis instances
707a71b feat(web): render interactive customer seat map
8c023c5 feat(web): confirm holds with realtime snapshots and server countdown
7a30acd feat(web): show authoritative pending orders and customer history
74ec458 test(web): verify customer reservation and order flow on desktop and mobile

```

Commit thứ 20 chứa tài liệu bàn giao và kết quả kiểm tra. Lấy hash/message và số
lượng đầy đủ sau khi commit bằng Git, không ghi hash chưa tồn tại:

```sh
git log --reverse --format='%h %s' ff4c12b..feature/phase-4-booking-realtime
git rev-list --count ff4c12b..feature/phase-4-booking-realtime
```

Danh sách sau commit được xuất vào `test-results/phase-4-commits.txt` (ignored).
PR Phase 4 hướng vào develop, không tự merge.

## Phase 5 — PayOS Payment & Ticketing

Người dùng chuyển Phase 5 cho **hoangphatdev <latruonghoangphat@gmail.com>**, thay
phân công nguyen-van-hoan trong kế hoạch ban đầu. Branch `feature/phase-5-payments`
based on Phase 4 `d94dd7c`; PR #7 Phase 4 đã được merge trên GitHub trong lúc làm
Phase 5, merge `9ff5564`. PR Phase 5 hướng develop, không tự merge.

Kế hoạch 17 commit có nội dung thực: [phase-5-plan.md](phase-5-plan.md).
Ngày author/committer mô phỏng 11–14/10/2026 theo chính sách người dùng đã duyệt.
Các lần kiểm thử dưới đây chạy thực ngày **23/10/2026**, không mô phỏng kết quả.

### Đã triển khai

- Official @payos/node 2.0.5; kiểm tra API thực tế và signatures trong SDK cài đặt.
  PayOS là provider cấu hình local theo yêu cầu mới. Ba channel credentials người
  dùng cung cấp chỉ ở `.env` ignored, không có trong source/PR/log.
- Hai migration payment sessions/settlement references đã áp dụng trên development
  và test PostgreSQL. Mã provider order safe integer duy nhất, key retry duy nhất,
  expiry gốc, URL checkout, thời điểm đối soát, tham chiếu settlement và webhook audit.
- Tạo/recover cùng phiên external từ order có giá server; khóa theo Phase 4, commit
  trước gọi network. Key không chuyển sang order khác; không đổi provider khi đã
  có attempt cho order. Create timeout không sinh mã external mới tùy tiện.
- Webhook PayOS xác minh signature đầy đủ, giữ các field signed bổ sung. Không tin
  unsigned success flags. SDK status request xác minh signed response. Return URL
  không đổi đơn thành PAID; local polling/periodic reconciliation bổ sung webhook.
- Finalization atomically kiểm tra amount/currency/link/order/hold/expiry/seat ownership,
  đổi SOLD, phát hành đúng một vé/item, PAID/SUCCEEDED, audit/notification/revision.
  Callback trùng/concurrent không sinh vé trùng. Socket hints chỉ phát sau commit.
- Late payment/sai tiền/currency/hủy/reclaim chuyển REFUND_REQUIRED và không bán
  ghế của hold/order mới. Tiền chuyển thêm sau đơn PAID được đánh dấu đối soát,
  giữ nguyên vé hợp lệ; matching status/webhook references không bị tính tiền thêm.
- QR signed opaque token + DB hash/version; API owner-only/no-store, UI QR cho VALID,
  USED/CANCELLED/historical không tạo QR hợp lệ giả. Seed nâng cấp đúng hai vé demo
  cũ khi có key; env setup sinh persistent signing key, không overwrite secrets.
- Checkout PayOS, success/failed page dựa kết quả backend, danh sách/chi tiết vé QR,
  navigation/profile links, trạng thái lỗi/chờ, responsive desktop/mobile.
- Mock provider chỉ development/test: success/failure/cancel, delayed 10 giây lưu DB,
  duplicate callback. Cùng transaction thật, không dùng mock thay nghiệp vụ.
- Công cụ đăng ký webhook HTTPS qua SDK có kiểm tra URL và lỗi không in secrets;
  chưa chạy đăng ký thật vì người dùng chưa có public URL. Không tạo AWS/tunnel.

**Phase 5 local hoàn tất; không phải toàn bộ MVP.** Tổng cộng 17 commit khi gồm
commit tài liệu cuối.

### Kết quả thực tế

| Kiểm tra              | Kết quả                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| Migrations            | 2 migration mới áp dụng thành công trên PostgreSQL development và test     |
| Seed                  | PASS trên development; giữ mật khẩu/SOLD inventory, nâng QR demo           |
| Unit/HTTP             | 83/83, 7 files, 153.09s                                                    |
| Subset sau hardening  | 26/26 SDK/QR/OpenAPI, 2 files, 55.78s                                      |
| Integration cuối      | 76/76, 5 files, 185.59s                                                    |
| Payment E2E           | 4/4 desktop/mobile, 1.1 phút                                               |
| Foundation E2E        | 20/20 desktop/mobile, 1.2 phút                                             |
| Auth E2E              | 4/4 desktop/mobile, 1.0 phút                                               |
| Event E2E             | 2/2 desktop/mobile, 1.3 phút                                               |
| Booking E2E           | 2/2 desktop/mobile, 1.3 phút                                               |
| Typecheck             | PASS shared/API source + tests/web/root configs                            |
| Lint/format           | PASS toàn repository, 0 lint warnings/errors                               |
| Production build      | PASS shared/API/Next; 22 application routes                                |
| Private settings scan | Không tìm thấy giá trị payment/signing keys trong tracked/candidate source |
| Webhook helper        | Node syntax check; chưa đăng ký public URL                                 |

Tổng E2E 32/32: foundation 20, auth 4, event 2, booking 2, payment 4.
76 integration cases gồm auth 14, event 22, booking 14, realtime 5, payment 21.
Payment dùng PayOS SDK verifier thật với chữ ký HMAC độc lập/key test; PostgreSQL/
Redis thật, không mock transaction. Kiểm tra 20 callback cùng lúc, altered reference,
wrong signature/amount/currency/link, expiry/reclaim, ghế đã SOLD cho người mới,
cancellation race, unique-ticket failure rollback và retry, extra transfer review,
owned/no-store QR, 8 create retries, đổi provider, key-bound order và mock delayed.

E2E dùng provider mock được cấu hình rõ trên test API, không giả kết quả ngân hàng.
Lượt đầu có một ca bị auth rate limit (4 đăng ký/phút với giới hạn 3). Fixture đã
đổi ca thất bại sang login tài khoản demo; giữ nguyên throttling và chạy lại 4/4.
Success URL giả vẫn pending; callback trùng tạo vé đúng, QR tồn tại sau reload,
viewport mobile không tràn; payment failure không hiện paid/ticket CTA.

### PayOS thật đã kiểm tra

Ngày 23/10/2026: API local xác thực customer, giữ ghế và tạo order đúng giá; PayOS
thật tạo link, SDK signed GET trả PENDING và amount khớp; hủy link qua SDK, backend
reconcile xác nhận payment/order CANCELLED và trả ghế. **Không chuyển tiền.**
Evidence tại `.local/phase-5-payos-live-evidence.json` (ignored); không có credentials.
User chưa có URL HTTPS public nên **chưa đăng ký/kiểm thử live webhook hoặc chuyển
khoản ngân hàng thành công**. Hướng dẫn tại [payments.md](payments.md).

### Giới hạn và Phase 6

- Chưa tự hoàn tiền; REFUND_REQUIRED là yêu cầu xử lý thủ công. Partial/overpayments
  cần review; không hỗ trợ tự cộng dồn nhiều partial transfers để phát hành vé.
- Chưa xác minh một real bank transfer → public webhook → vé. Không gọi đây là
  bằng chứng tích hợp ngân hàng production đầy đủ. Không có benchmark 1.000 users.
- Chưa có durable outbox/email/queue worker; in-app receipt notification được lưu
  cùng transaction. Socket mất hint được REST/reconnect phục hồi.
- Cảnh báo pg@8 ở generator Phase 3 vẫn được ghi nhận; không thuộc payment locks.
- Phase 6 tiếp theo: staff event assignment authorization, scanner/manual credential,
  nguyên tử VALID → USED, duplicate/concurrent check-in, analytics theo DB.
- Kết quả CI GitHub chỉ xác nhận sau khi workflow remote chạy.

### Commit Phase 5

16 commit đã tồn tại trước commit tài liệu cuối:

```text
0f15eda docs: plan phase five PayOS payment and ticket delivery
8e6826a chore(payments): install official PayOS SDK and QR renderer
2366b8a feat(db): persist payment sessions and verifiable ticket credentials
dbecee6 feat(config): validate private PayOS and ticket signing settings
c34ffba feat(shared): define verified payment and ticket contracts
5232b15 feat(payments): implement signature verified PayOS provider adapter
e4973e1 feat(payments): prepare idempotent server priced payment sessions
997cdc2 feat(tickets): sign opaque QR credentials and authorize ticket reads
6d0661f feat(payments): finalize verified settlements and issue tickets atomically
c3f2a4a feat(payments): expose verified callbacks and isolated local simulation
35e7c37 feat(seed): prepare verifiable demo QR and persistent signing keys
47dae5a feat(web): connect checkout to provider verified payment results
31deb74 feat(web): display owned QR tickets and account navigation
84b2b2e fix(payments): track settlement references and verify signed payment policies
2675ee2 test(payments): prove callback retries late settlement and ticket rollback
d5d70b3 test(web): verify payment tickets and local PayOS integration tooling

```

Commit thứ 17 ghi tài liệu và bằng chứng kiểm tra. Lấy toàn bộ hash/messages/số lượng
sau commit từ Git, không tự tạo hash:

```sh
git log --reverse --format='%h %s' d94dd7c..feature/phase-5-payments
git rev-list --count d94dd7c..feature/phase-5-payments
```

Danh sách sau commit xuất tại `test-results/phase-5-commits.txt` (ignored).

Phase 5 artifacts local: `.local/phase-5-*.log`, screenshots `test-results/phase-5-verified/`.
Sau E2E, `.next` đã được chép về thư mục workspace thường; không còn phụ thuộc symlink `/tmp`.

## Phase 6 — Check-in & Analytics

Owner authorized: **hoangphatdev <latruonghoangphat@gmail.com>**. Branch
`feature/phase-6-checkin`, base `113c52b`. PR #9 Phase 5 đã merge trên GitHub.
17 meaningful commits including final documentation; simulated dates 15–18/10/2026.
Actual validation: 23/10/2026. [Breakdown](phase-6-plan.md).

Implemented: active assigned STAFF-only verification; atomic admission with event/
user/ticket locks, one CheckIn record, timestamp/staff/audit/revision; signed QR/hash
or random manual code; used/cancelled/wrong-event/invalid outcomes. Private realtime
attendance hints/revocation and REST recovery. Mobile camera UI plus manual fallback.
Organizer scoped paid revenue, Vietnam daily dates, inventory/sections/attendance
and recent orders with Recharts. ADMIN KPIs, measured process monitoring, user
filter/access lock/unlock (session revocation, ADMIN protection), pending organization
review with atomic audited decisions. No fake business/queue metrics.

Evidence: API/Next production builds PASS, strict typecheck PASS. Real DB/Redis
integration 8/8 (43.46s), including 20/100 simultaneous confirmations: exactly one
201, all others 409; one audit/check-in. Wrong role/event/QR/cancelled/revoked,
Vietnam revenue boundary, organization scope, account lock/unlock and concurrent
org review also checked. Check-in E2E 2/2 desktop/mobile (1.4m) covers customer
payment -> QR -> staff manual verification/admission -> duplicate rejection ->
organizer attendance increases. Full unit run: 92 pass plus one decoder test failed
because MultiFormatReader required initialization; corrected test to QRCodeReader
(the browser scanner's reader) and targeted rerun passed 1/1 (11.24s). Phase 7 will
run full regression including the corrected test. Lint imports corrected; final
lint/format results checked before delivery.

Limits: physical mobile camera not exercised; actual QR image rendering/decoding
was tested. No automatic gate time window; assigned STAFF can admit PUBLISHED events
for local demo. No automatic refunds, durable socket outbox or production load claim.
Existing pg@8 generator warning remains. Phase 7 waiting room/quality is next and
explicitly requested in the same session. No AWS resources.

16 pre-delivery commits (final commit hash obtained from Git after commit):

```text
1b6bc3c docs: plan phase six check-in and analytics
ac96580 chore(web): install QR scanner and analytics charts
b9439a7 feat(db): index attendance and paid order reporting
d072847 feat(shared): define admission reporting and realtime contracts
cf034bc feat(checkin): define validated credential and admission policies
72a4b6b feat(checkin): verify assigned staff and confirm admission atomically
282fe16 feat(staff): expose assigned events and consistent attendance stats
a756082 feat(analytics): aggregate scoped sales and Vietnam daily revenue
71adc7d feat(admin): aggregate real metrics and enforce account review rules
dde6949 feat(api): wire check-in analytics and administrator endpoints
dccef63 feat(realtime): publish private attendance hints and revoke staff rooms
56b8b29 feat(web): implement mobile staff scanning and manual admission
51bc41a feat(web): visualize organizer revenue inventory and attendance
be537f6 feat(web): implement admin dashboard account and organization review
01842dc test(checkin): verify admission dates money and real QR decoding
a412138 test(checkin): prove concurrent admission and customer to staff flow

```

Full list: `git log --reverse --format='%h %s' 113c52b..feature/phase-6-checkin`;
count: `git rev-list --count 113c52b..feature/phase-6-checkin`.
Artifacts/logs: `.local/phase-6-*.log`, `test-results/phase-6-commits.txt` (ignored).

## Phase 7 — Waiting Room & Quality

Authorized owner per assignment: **nguyen-van-hoan <nguyenvanh842k5@gmail.com>**.
Branch `feature/phase-7-optimization`, base `4239dab` (Phase 6). Phase 6 PR #12 is
merged on GitHub. Phase 7 uses 17 meaningful commits with explicitly simulated
19–22/10/2026 dates. Actual checks took place 23/10/2026.

Implemented: stable per-user/event sessions, atomic Redis TIME/FIFO/capacity/TTL
Lua, HMAC nonce admission, owner/signature/current-lease checks, fail-closed gate,
server deadline recheck inside PostgreSQL hold transaction, checkout continuation
for confirmed holds. Membership-scoped Organizer/ADMIN settings with audit, customer
position/countdown/poll/reload/release, owner-only receipt inbox/unread/read tracking.
Fixed transaction query sequencing in seat generator and limited staff socket auth
refresh to actual authentication failures. CI runs suites in isolated API processes
so shared-IP login throttling remains unchanged.

Verified: full unit 102/102 across 10 files (127.53s), full PostgreSQL/Redis
integration 91/91 across 7 files (249.44s), API and Next production builds, strict
typecheck and lint. Waiting integration 7/7 independently (32.46s): 100 distinct users
with capacity five => five leases and 95 queued; FIFO/refresh/expiry/stolen tokens,
real hold and checkout, scoped settings/audit, notification ownership/idempotency.
Final targeted rerun 7/7 (40.24s) also checks uppercase UUID refresh resolves to the
same Redis room. Customer room countdown resync uses server timestamp without
double subtracting elapsed time after polling.
No private runtime secret matched candidate source files. Authenticated browser
regression completed 16/16 across desktop/mobile, including timer resync, refresh
position, promotion, purchase/inbox, event create/approve, realtime holding, payment
success/failure and single-use staff admission/analytics. Foundation dependency-failure/anonymous-route/accessibility suite passed 20/20
(1.1m), giving 36/36 final browser cases. All suites used real HTTP responses;
no REST interception or fabricated dependency health. Local readiness confirmed PostgreSQL/Redis up, three real public events, frontend
HTTP/static assets 200 and explicit Swagger settings/inbox-pagination contracts.

The first combined browser run hit real per-IP auth limits because previously
separate suites shared an API process; it was stopped. Security limits were not
relaxed. The regression runner now starts/stops the real API per suite and viewport.

Limits: local prototype, approximate lease presence, Redis restart requires rejoin,
capacity reductions preserve leases, no verified anti-bot/production fairness/load
capacity, no durable Socket.IO outbox. No AWS or email/worker service. Physical
camera not tested; actual rendered QR image decoder and manual browser check-in
were exercised. PayOS public webhook and real bank settlement still require an
HTTPS callback and actual transfer. No automatic refund execution. pg@8 still emits a concurrent-query deprecation
warning in some paths; current tests pass and no pg@9 compatibility is claimed.

16 implementation commits recorded (delivery documentation follows):

```text
f35b2d5 docs: plan waiting room admission and final quality work
36ff7fc feat(db): persist waiting room capacity and runtime configuration
bfc416f feat(shared): define admission contracts and signed token policy
c1814af feat(waiting): atomically queue and admit Redis sessions
fbbf62c feat(waiting): manage stable user sessions and admission leases
88b0813 feat(waiting): expose authenticated room endpoints
34ba2e3 feat(booking): enforce admission before atomic holds
600c067 feat(events): authorize audited waiting room settings
0d731c9 feat(web): render waiting position and server admission deadline
c465d51 feat(web): manage event waiting room settings
456b22c feat(notifications): expose owned receipt notification inbox
41050fb feat(web): display receipt notifications and unread state
62f06bb fix(quality): harden queue expiry and realtime recovery
49b27b9 test(waiting): verify signed leases and admission boundaries
34c2e0e test(waiting): prove bounded admission and hold authorization
7bba0f2 test(web): verify waiting flow and isolate browser rate limits
```

Full list after delivery:
`git log --reverse --format='%h %s' 4239dab..feature/phase-7-optimization`.
Count: `git rev-list --count 4239dab..feature/phase-7-optimization`.
Logs `.local/phase-7-*.log`, copied screenshots `test-results/phase-7-verified/`,
full commit exports `test-results/phase-6-commits.txt` / `phase-7-commits.txt` are local
ignored verification artifacts. See [waiting-room runbook](waiting-room.md).

Final Next build output restored to a regular workspace `.next` directory after
all browser tests, with matching BUILD_ID, so startup does not depend on `/tmp`.

Local servers left running after verification: web http://localhost:3000, API
http://localhost:4000, Swagger http://localhost:4000/api/docs. API uses development
configuration and the web serves the verified production build. Local artifacts:
`.local/phase-7-local-readiness.log`, `.local/phase-7-web-local.log`,
`.local/phase-7-api-local.log`. Restart using the normal README commands after
stopping the existing local servers.

Phases 6 and 7 local implementations are delivered. Follow-up validation is a real
PayOS settlement/public HTTPS webhook, physical mobile camera and measured Locust
load testing; these are not claimed complete. No AWS deployment was performed.

## Google Login — extension after Phase 7

Branch `feature/google-login`, based on Phase 7 `3d6d423`; Phase 7 PR #14 has merged.
Uses the existing confirmed local Git author nvtank and actual commit timestamps
for this extension outside the seven-phase simulated schedule.

Implemented: official GIS popup button on login/register, runtime feature flag,
backend Google SDK verification, five-minute Redis/HttpOnly browser nonce with
atomic single use, local JWT/rotating refresh sessions, passwordless CUSTOMER
creation and subject-based returning login. Existing email collisions require
explicit current-owner linking from profile, matching email and recent active
session; role/order ownership is preserved. Google-only accounts cannot use the
bcrypt dummy password. Profile shows real auth methods. Popup headers, expiry,
SDK failure/retry and safe next-route handling included. No Google API access/
refresh token or Client Secret is stored. Actual Client ID is only in ignored
local `.env`; tracked `.env.example` is blank. Private config scan passed.

Validation: full unit run 115/115 across 11 files (354.55s); final Google verifier
rerun 13/13 (47.44s); final real PostgreSQL/Redis auth integration 21/21 across two
files (283.46s). Initial integration caught missing PostgreSQL void-result cast in
advisory locking; fixed with `::text` and all cases reran successfully. Google SDK
also fetched real public signing certificates successfully (two keys), without
an account token. Backend and Next production builds passed. Browser tests passed 10/10: four Google nonce/SDK-failure cases and six existing
password/session/readiness/unconfigured-Google cases across desktop/mobile. Strict
typecheck, lint, formatting and API/Next builds passed. Validation began 23/10/2026
and finished 24/10/2026 (Asia/Ho_Chi_Minh). Local readiness is recorded below.

Google library loads lazily on credential verification. Browser startup timeout
allows slow WSL filesystem imports; authentication rate limits are unchanged.
Unit/integration tests substitute only the external Google certificate source,
using actual RSA signatures and Google's SDK verification. Browser Google tests
substitute only the external SDK script; all REST reaches the actual local API.
No live Google account authorization is claimed. Google Console authorized origins
and interactive account authorization remain the account owner's step.

Run/configuration/security details: [google-auth.md](google-auth.md). Logs are local
`.local/google-*.log`; `.env` is ignored and not tracked. Local source/build artifacts
are restored before delivery. No AWS resources or messaging services added.

Final local verification on 24/10/2026: API/web restarted from the new regular
workspace build; PostgreSQL/Redis readiness ok, Google runtime config enabled,
nonce endpoint 201. The actual GIS script and official Google button rendered at
http://localhost:3000/login. Google returned `The given origin is not allowed for
the given client ID`, so live interactive login remains blocked by the OAuth
client's external Authorized JavaScript origins configuration/propagation. No
completed real Google account login is claimed. The actual client ID remains only
in ignored `.env`. Local screenshot `test-results/google-verified/google-live-inspection.png`
and sanitized `.local/google-ui-inspection.log` record this boundary.

Four commits cover schema/config, verified backend sessions/linking, UI and
security/browser tests/runbook. Full hashes are exported after the final commit
at `test-results/google-login-commits.txt` (ignored); Git is authoritative.

## Experience redesign extension — 24/10/2026

Implementation, automated verification and final local startup are complete. This extension
uses the confirmed `nvtank` identity and actual commit timestamps outside the original
seven-phase simulated schedule.

A shared indigo/violet/ink visual system connects the landing, event catalog/detail,
login/register, account navigation, checkout steps and QR ticket presentation. GSAP
animates the hero; Motion handles short reveals, active navigation and FAQ expansion,
respecting reduced-motion preferences. Local concert photography has source credits.

New pages: `/about`, `/contributors`, `/artists`, `/artists/[slug]`, `/community`,
`/guide`. They link to events, tickets, booking guidance and the supplied team GitHub
accounts/repository. No dead placeholder pages or invented testimonials were added.

An additive migration and development-only artist seed support the actual directory
and event associations. Purchase-backed booking reviews enforce ownership, validated
ratings/comments, single author/event records, transactional concurrent updates and
audit records. Public reads hide cancelled/ineligible purchases. Completed event
details remain available from community links. Session cache restoration preserves
loading public-query observers rather than destroying them during login bootstrap.

Verified so far: API/Next builds, strict typechecks, ESLint, formatting, 7 real database
integration cases and 22 desktop/mobile browser cases. Local API/web readiness,
new routes and normal-motion desktop/mobile rendering were checked successfully.

Runbook and final verification details: [experience-redesign.md](experience-redesign.md).
Runtime `.env` remains ignored/untracked; actual Google/PayOS/signing configuration
has been scanned out of the changed source. No AWS service or deployment added.

Final delivery: http://localhost:3000, API http://localhost:4000, Swagger /api/docs.
PostgreSQL/Redis readiness is up; four labelled demo artist profiles are present and
no customer reviews were seeded. The regular workspace Next build was restored
from the temporary Linux build directory. Changes are collected in PR #19;
full hashes/messages are exported locally after the documentation commit at `test-results/experience-redesign-commits.txt`.
