# Tiến độ TixFlow

Cập nhật: 23/10/2026, múi giờ Asia/Ho_Chi_Minh. Timeline 20/09–22/10 trong đề bài là
kế hoạch; lịch sử Git dùng thời điểm thực tế, không backdate.

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
git log --reverse --format='%h %s' feature/phase-1-foundation
git rev-list --count feature/phase-1-foundation
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
17 atomic commits; dùng timestamp thực tế. Xem [phase-2-plan.md](phase-2-plan.md).

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
git log --reverse --format='%h %s' 88a6bfa..feature/phase-2-auth
git rev-list --count 88a6bfa..feature/phase-2-auth
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
[commit breakdown](phase-3-plan.md). Dùng thời gian thực, không gán author khác.

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
git log --reverse --format='%h %s' 16f6146..feature/phase-3-events
git rev-list --count 16f6146..feature/phase-3-events
```

Danh sách hash/message cuối được xuất từ Git tại `test-results/phase-3-commits.txt`
sau commit bàn giao, không tự tạo hash cho commit chưa tồn tại. Phase 3 chờ review
qua PR vào develop; không tự merge khi chưa review.
