# TixFlow — Real-time Event Ticketing Platform

Nền tảng bán vé local, phát triển theo 7 phase. **Đã triển khai Phase 1–6: authentication, event management, booking/realtime,
thanh toán PayOS và vé QR.** Đã có staff check-in, analytics và quản trị; waiting room thuộc Phase 7. Không dùng
AWS hoặc yêu cầu AWS credentials.

## Cài đặt và chạy

Yêu cầu Node.js 24 LTS, pnpm 10.34.1, Docker Engine/Desktop với Docker Compose.
Trên WSL, dùng Docker Engine trong Ubuntu hoặc Docker Desktop WSL integration.
Cài dependencies bằng Node của cùng hệ điều hành.

Docker Engine trên Ubuntu có thể cài theo [hướng dẫn chính thức](https://docs.docker.com/engine/install/ubuntu/).
Môi trường WSL hiện tại đã cài và bật Docker; mở lại terminal hoặc chạy
`newgrp docker` nếu phiên cũ chưa nhận quyền của docker group.

```sh
npm install --global pnpm@10.34.1
pnpm install --frozen-lockfile
pnpm env:setup
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`env:setup` tạo `.env` bị Git ignore với mật khẩu PostgreSQL/JWT secret ngẫu nhiên,
không ghi đè file đã có. Chạy `pnpm env:setup -- --upgrade` để thêm cấu hình auth
còn thiếu. Nếu sửa database password/port, sửa cả DATABASE_URL tương ứng. JWT
placeholder trong `.env.example` không dùng để chạy API.

`pnpm infra:up` dùng `docker compose --env-file .env -f infrastructure/docker-compose.yml
up -d --wait`. PostgreSQL/Redis có healthcheck, named volumes và chỉ publish loopback.
`pnpm infra:down` dừng containers nhưng giữ dữ liệu.

| Thành phần                 | Địa chỉ                                   |
| -------------------------- | ----------------------------------------- |
| Frontend                   | http://localhost:3000                     |
| REST API                   | http://localhost:4000/api/v1              |
| Swagger (development/test) | http://localhost:4000/api/docs            |
| Readiness                  | http://localhost:4000/api/v1/health       |
| Liveness / metrics local   | `/api/v1/health/live` / `/api/v1/metrics` |
| PostgreSQL / Redis         | localhost:5432 / localhost:6379           |

`pnpm dev` build shared rồi chạy hai app với watch. Sau khi sửa shared, chạy lại
`pnpm --filter @tixflow/shared build`. Production build local: `pnpm build`, rồi
`pnpm --filter @tixflow/api start` và `pnpm --filter @tixflow/web start` trong hai terminal.
Browser dùng Next.js proxy cùng origin. API_INTERNAL_URL được cố định lúc build;
không đưa secrets vào NEXT_PUBLIC_*.

Nếu Node `copyfile` báo `EPERM` khi build trên ổ Windows gắn qua WSL (`/mnt/c`,
`/mnt/d`), dùng checkout trên filesystem Linux. Trong kiểm thử Phase 3, `.next` tạm dùng filesystem Linux trong `/tmp` để tránh
lỗi này; sau kiểm thử đã chép bản build về thư mục `.next` thường của workspace.
Các cấu hình/thư mục sinh tự động không được commit.

Lockfile ghi phiên bản thực: Next.js 16.4.2, React 19.3.1, NestJS 11.2.7, Prisma
7.10.1, TypeScript 5.9.3, Tailwind CSS 4.3.3. Prisma dùng PostgreSQL driver adapter,
generate client trước build/dev/typecheck. Inter được đóng gói local.

## Tài khoản demo

Chỉ dùng development/test. Mật khẩu mặc định `TixFlowDemo!2026`, hoặc DEMO_PASSWORD
của bạn lúc seed đầu. Seed lại giữ mật khẩu hiện có.

| Email                   | Role      | Trang sau đăng nhập |
| ----------------------- | --------- | ------------------- |
| admin@tixflow.local     | ADMIN     | `/admin`            |
| organizer@tixflow.local | ORGANIZER | `/organizer`        |
| staff@tixflow.local     | STAFF     | `/staff`            |
| customer@tixflow.local  | CUSTOMER  | `/profile`          |
| customer2@tixflow.local | CUSTOMER  | `/profile`          |

Seed tạo 1 tổ chức, 3 sự kiện tương lai, 300 ghế (concert 200 ghế VIP/Standard),
1 đơn PAID và 2 vé mẫu VALID/USED. Ngày tương đối theo lần seed đầu. Chạy lại giữ
mật khẩu, ngày sự kiện và SOLD inventory. Vé mẫu không thay thế luồng phát hành QR.

1. Mở `/system`: API/PostgreSQL/Redis phải báo đã kết nối.
2. Đăng nhập từng role, kiểm tra workspace đúng và từ chối role khác.
3. Organizer xem sự kiện, doanh thu đơn PAID, số ghế bán và tỷ lệ lấp đầy từ database.
4. Đăng ký customer mới, cập nhật tên/điện thoại tại `/profile`.
5. Reload hai tab để khôi phục phiên; đổi mật khẩu để thu hồi mọi phiên.
6. Đăng nhập với mật khẩu mới, đăng xuất và kiểm tra trang riêng yêu cầu login.

### Demo quản lý sự kiện Phase 3

1. Đăng nhập Organizer, mở `/organizer/events/new`, chọn TixFlow Live và nhập nội dung,
   địa điểm, URL banner/ảnh, chính sách, ngày sự kiện và cửa sổ bán vé (giờ Việt Nam).
2. Lưu nháp, tạo VIP 2 hàng × 20 ghế và Standard 8 × 20, đặt giá từng khu.
   Có thể bật/tắt ghế nháp và phân công `staff@tixflow.local`.
3. Gửi duyệt. Nội dung và sơ đồ khóa khi chờ duyệt; chưa xuất hiện trong danh mục công khai.
4. Admin mở `/admin/events`, xem chi tiết/lịch sử rồi duyệt hoặc từ chối kèm lý do.
   Organizer sửa bản bị từ chối và gửi lại được.
5. Sau duyệt, khách mở `/events`, tìm tên, lọc danh mục/thành phố/ngày/giá,
   xem trang chi tiết và số ghế khả dụng. Bộ lọc được lưu trong URL.
6. Chỉ xóa được nháp chưa có giao dịch. Sơ đồ có đơn hàng/lịch sử giữ ghế không được tạo lại;
   ghế SOLD/HELD không được bật/tắt. Các thao tác được ghi audit trong transaction.

Dashboard Organizer hiện có KPI tổng hợp thực; biểu đồ doanh thu/đơn hàng mới và
analytics chi tiết thuộc Phase 6. Trang Admin Phase 3 tập trung duyệt sự kiện.
Ảnh dùng URL http/https; chưa có upload/lưu trữ file.

Đã có chọn/giữ ghế, thanh toán PayOS và phát hành QR. Check-in thuộc Phase 6. Không hiển thị Google Login hoặc reset
password khi chưa có OAuth/email delivery thực.

### Demo booking và realtime Phase 4

1. Đăng nhập `customer@tixflow.local`, mở concert → Chọn ghế. Dùng browser/context khác
   đăng nhập `customer2@tixflow.local` và mở cùng sơ đồ.
2. Chọn tối đa 4 ghế (theo cấu hình event), bấm Xác nhận giữ ghế. Chỉ phản hồi thành công
   từ backend mới xác lập hold. Browser thứ hai thấy ghế đang được người khác giữ.
3. Countdown tối đa 300 giây dựa trên thời gian server. Reload khôi phục hold đang hiệu lực;
   tạo đơn hàng không gia hạn. Khi hết hạn người khác có thể giữ ngay dù cleanup chưa chạy.
4. Tiếp tục đến đơn hàng: giá tính từ server, chỉ chủ hold được tạo/xem/hủy. Hủy đơn hoặc
   hold trả ghế chưa bán. Lịch sử đơn thật nằm ở `/profile`.
5. Checkout có thanh toán PayOS; backend xác minh mới phát hành vé. Xem demo Phase 5 bên dưới.

Socket.IO kết nối trực tiếp API port 4000 (WebSocket only). Có thể đặt
`NEXT_PUBLIC_REALTIME_URL` trước build nếu dùng origin khác; CORS/Origin whitelist
phải khớp frontend. Mất kết nối tự reconnect và tải snapshot REST; REST cũng đồng bộ
mỗi 10 giây. Payload WebSocket chỉ là gợi ý invalidate theo revision.

`HOLD_RECONCILE_INTERVAL_MS=5000` quét PostgreSQL định kỳ, không dựa Redis expiry events.
`SOCKET_REDIS_ADAPTER=true` bật Redis Pub/Sub để room updates đi giữa nhiều API instance;
đã integration-test qua hai instance thật. PostgreSQL luôn quyết định quyền giữ ghế.
Chưa có durable outbox hoặc benchmark tải; không suy ra năng lực production từ 100 requests.

### Demo PayOS và vé QR Phase 5

Phụ trách theo yêu cầu mới: `hoangphatdev <latruonghoangphat@gmail.com>`.
Cấu hình `PAYMENT_PROVIDER=payos`, ba biến PAYOS_* và persistent TICKET_SIGNING_KEY
trong `.env` local, rồi khởi động lại API. `env:setup -- --upgrade` thêm các biến còn
thiếu và không in/ghi đè secrets. Chỉ lưu cấu hình mẫu không chứa credentials trong Git.

1. Customer giữ ghế, mở đơn và bấm **Thanh toán qua PayOS**.
2. Link dùng số tiền server và deadline hold ban đầu. Backend xác minh webhook có
   chữ ký hoặc truy vấn PayOS trực tiếp; tham số URL thành công không tạo vé.
3. Đơn PAID phát hành đúng số vé tại `/my-tickets`; mở từng vé để xem QR.
4. Tiền đến muộn/sai hoặc ghế đã đổi chủ → REFUND_REQUIRED, không phát hành vé;
   đây là đánh dấu cần xử lý, chưa phải đã hoàn tiền.
5. Khi có URL HTTPS công khai, đăng ký webhook theo [hướng dẫn PayOS](docs/payments.md).
   Hiện chưa đăng ký URL công khai. Đã kiểm tra PayOS thật tạo/đọc/hủy link, không
   chuyển tiền; chưa kiểm chứng chuyển khoản ngân hàng và webhook công khai.

`PAYMENT_PROVIDER=mock` chỉ hoạt động development/test, có success/failure/cancel,
chậm 10 giây và callback trùng qua cùng transaction nghiệp vụ. Production từ chối
mock. E2E dùng mock local; không giả danh kết quả chuyển tiền PayOS thật.

## Kiểm thử

```sh
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm test:infra:up
pnpm test:db:prepare
pnpm test:integration
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
pnpm test:e2e:auth
pnpm test:e2e:events
pnpm test:e2e:booking
pnpm test:e2e:payments
pnpm test:infra:down
```

Test PostgreSQL riêng tại 55432, Redis 56379, DB tixflow_test dùng tmpfs. Test guard
từ chối database ngoài local test DB; chỉ xóa fixtures của lần chạy, không truncate.
TEST_DATABASE_URL/TEST_REDIS_URL có thể cấu hình nhưng phải giữ quy tắc an toàn đó.

Vitest kiểm tra validation, JWT, RBAC, HTTP, event lifecycle/ownership, grid atomicity,
review races, sold inventory và auth với DB/Redis thật. Phase 4 bổ sung HTTP
concurrency 20/100 yêu cầu tranh một ghế, rollback nhóm ghế, TTL/ownership/retry,
giá đơn từ server và Socket.IO qua hai backend dùng Redis thật.

Playwright tự bật API/web trên 4000/3000: dừng pnpm dev trước khi chạy. Foundation
suite cố ý dùng dependency ports đóng để kiểm tra lỗi; auth/events/booking dùng DB test thật.
Events E2E seed tài khoản demo vào DB test và tạo sự kiện có tên riêng cho mỗi lần chạy.
Chạy desktop/mobile, không mock REST responses. Báo cáo/trace bị Git ignore.
CI đã cấu hình; kết quả remote chỉ xác nhận sau khi CI chạy.

## Cấu trúc

```text
apps/
  api/
    prisma/                # Schema, migrations và SQL constraints
    prisma.config.ts
    src/
      auth/                # JWT provider, bcrypt, refresh sessions, guards, DTOs
      users/               # Own profile and password management
      organizations/       # Membership-scoped reads
      events/              # Public catalog, organizer CRUD/grid/staff, admin review/audit
      booking/ orders/     # Atomic holds, reconciliation and server-priced orders
      payments/ tickets/   # PayOS, verified finalization, signed owned QR tickets
      realtime/            # JWT room gateway, optional Redis adapter
      database/            # Prisma PostgreSQL lifecycle
      common/http/         # Request IDs, logs, errors, measured metrics
      config/ health/ monitoring/
      seed.ts
    test/                  # Unit, HTTP and real DB integration
  web/src/
    app/(public)/          # Home, events, system, login, register, profile
    app/(workspace)/       # Organizer event management, admin review, staff shell
    components/events/     # Catalog, forms, grids, dashboards and review dialogs
    components/booking/    # Interactive map, countdown, realtime, checkout and orders
    components/auth/       # Forms, gates, bootstrap, profile
    components/ui/         # Accessible Radix/shadcn-style primitives
    lib/ stores/           # Validated API client, memory-only auth state
packages/shared/           # Shared types and constants
packages/config/           # Strict TypeScript configuration
infrastructure/            # Development and test Compose
scripts/                   # Private environment setup, guarded test migrations
e2e/ docs/
```

## Tiến độ

Phase 1: design system, public/dashboard layouts, Nest HTTP foundation, health/metrics.
[PR #2](https://github.com/nvtank/ticketflow-aws/pull/2) đã merge vào develop.
Phase 2: Prisma schema/migration/seed thật, đăng ký/login, bcrypt, JWT, refresh token
hash/rotation/revocation, HttpOnly cookie, backend RBAC/membership, profile/password
và route protection. Access token chỉ ở memory, không lưu browser storage.

Phase 2 đã merge qua [PR #4](https://github.com/nvtank/ticketflow-aws/pull/4).
Phase 3: event CRUD theo tổ chức, seat generator, staff assignment, admin approval,
public catalog/details và KPI Organizer thực. Phase 4: atomic booking, TTL cleanup,
server-priced checkout orders và realtime. Phase 5 bổ sung PayOS, payment integrity
và QR tickets. Phase 6 bổ sung check-in/analytics; Phase 7 bổ sung waiting room Redis và thông báo. Không
có KPI hardcode hoặc tuyên bố tải chưa đo. Chưa tạo worker khi chưa cần jobs.

Xem [tiến độ và kết quả thực tế](docs/progress.md), [Phase 3 plan](docs/phase-3-plan.md),
[kiến trúc](docs/architecture.md), [database](docs/database.md), [API](docs/api.md).
Phase 2 được người dùng chuyển cho `nvtank <tuannguyen.120910@gmail.com>`;
author được giữ nguyên khi tái dựng ngày commit theo timeline.

Phase 3 dùng author được xác nhận `nguyen-van-hoan <nguyenvanh842k5@gmail.com>`
trên branch `feature/phase-3-events`, base develop `16f6146`.

Ngày Git đã được mô phỏng theo yêu cầu mới của người dùng; xem [timeline và backup gốc](docs/commit-timeline.md).
Kết quả kiểm thử dùng thời gian chạy thực, không mô phỏng.

Phase 5: [kế hoạch 17 commits](docs/phase-5-plan.md), [cấu hình PayOS và giới hạn](docs/payments.md).

### Phase 6 — Check-in và analytics

Staff đăng nhập `staff@tixflow.local`, mở `/staff` rồi chọn sự kiện được phân công.
Quét bằng camera hoặc nhập mã vé; “Kiểm tra vé” chỉ xác minh, “Xác nhận vào cổng”
mới tiêu thụ vé. Quét lại bị từ chối. `/organizer/analytics` hiển thị doanh thu theo
ngày Việt Nam và tồn kho/check-in thực. `/admin` có KPI, users/organizations review
và `/admin/monitoring`. Khóa tài khoản thu hồi session; ADMIN không bị khóa qua UI.

Kiểm thử: `pnpm test:e2e:checkin`. QR decoder đã kiểm tra bằng ảnh render thật;
chưa kiểm tra camera vật lý trên điện thoại. Không có giới hạn giờ mở cổng tự động
ở phase này: STAFF được phân công có thể check-in sự kiện PUBLISHED để demo local.

### Phase 7 — Phòng chờ và kiểm thử cuối

Organizer mở một sự kiện của mình, bật phòng chờ và lưu giới hạn số phiên (1–500).
Hai CUSTOMER đăng nhập ở hai trình duyệt riêng để xem thứ tự chờ, refresh giữ vị trí,
rời hàng đợi cấp lượt cho người tiếp theo. Quyền vào có hạn 10 phút mặc định;
giữ ghế vẫn chỉ 5 phút. Backend xác minh token/owner/Redis trước khi giữ ghế.
`/notifications` hiển thị biên nhận đã lưu sau thanh toán và trạng thái chưa đọc.

```sh
pnpm test:e2e:waiting
pnpm test:e2e:integration
```

[Waiting room runbook](docs/waiting-room.md) giải thích TTL, lỗi Redis và giới hạn.
Đây là prototype local; chưa xác minh chống bot/fairness production hay tải 1.000 người.
PayOS tạo/đọc/hủy payment link đã thử thật; chưa có public HTTPS webhook và chưa
chuyển tiền ngân hàng thật để xác minh settlement. Xem [PayOS](docs/payments.md).

### Google Login

Đăng nhập/đăng ký hỗ trợ nút Google chính thức khi `GOOGLE_CLIENT_ID` được cấu hình
trong `.env` local. Tài khoản đã có email/mật khẩu cần đăng nhập rồi liên kết Google
tại `/profile`. Không cần Client Secret; không lưu Google token.
Xem [cấu hình Google, luồng liên kết và kiểm thử](docs/google-auth.md).
