# TixFlow — Real-time Event Ticketing Platform

Nền tảng bán vé local, phát triển theo 7 phase. **Đã triển khai nền tảng Phase 1 và
Database & Authentication của Phase 2.** Chưa hoàn thành luồng bán vé. Không dùng
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

Lockfile ghi phiên bản thực: Next.js 16.4.2, React 19.3.1, NestJS 11.2.7, Prisma
7.10.1, TypeScript 5.9.3, Tailwind CSS 4.3.3. Prisma dùng PostgreSQL driver adapter,
generate client trước build/dev/typecheck. Inter được đóng gói local.

## Tài khoản demo Phase 2

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
3. Organizer xem membership thực; dashboard chưa có KPI kinh doanh.
4. Đăng ký customer mới, cập nhật tên/điện thoại tại `/profile`.
5. Reload hai tab để khôi phục phiên; đổi mật khẩu để thu hồi mọi phiên.
6. Đăng nhập với mật khẩu mới, đăng xuất và kiểm tra trang riêng yêu cầu login.

Chưa thể demo chọn ghế/thanh toán/check-in. Không hiển thị Google Login hoặc reset
password khi chưa có OAuth/email delivery thực.

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
pnpm test:infra:down
```

Test PostgreSQL riêng tại 55432, Redis 56379, DB tixflow_test dùng tmpfs. Test guard
từ chối database ngoài local test DB; chỉ xóa fixtures của lần chạy, không truncate.
TEST_DATABASE_URL/TEST_REDIS_URL có thể cấu hình nhưng phải giữ quy tắc an toàn đó.

Vitest kiểm tra validation, JWT, RBAC, HTTP và auth với DB/Redis thật. Concurrent
refresh và duplicate registration chưa chứng minh chống overselling; tests seat
hold 20/100 requests thuộc Phase 4.

Playwright tự bật API/web trên 4000/3000: dừng pnpm dev trước khi chạy. Foundation
suite cố ý dùng dependency ports đóng để kiểm tra lỗi; auth suite dùng DB test thật.
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
      database/            # Prisma PostgreSQL lifecycle
      common/http/         # Request IDs, logs, errors, measured metrics
      config/ health/ monitoring/
      seed.ts
    test/                  # Unit, HTTP and real DB integration
  web/src/
    app/(public)/          # Home, events, system, login, register, profile
    app/(workspace)/       # Protected organizer/staff/admin shells
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
[PR #2](https://github.com/nvtank/ticketflow-aws/pull/2) đã mở vào develop, chưa merge.
Phase 2: Prisma schema/migration/seed thật, đăng ký/login, bcrypt, JWT, refresh token
hash/rotation/revocation, HttpOnly cookie, backend RBAC/membership, profile/password
và route protection. Access token chỉ ở memory, không lưu browser storage.

Phase 3 tiếp theo: event CRUD, seat generator, admin approval. Phase 4–7 bổ sung
atomic booking, realtime, payment, QR, check-in, analytics và waiting room. Không
có KPI hardcode hoặc tuyên bố tải chưa đo. Chưa tạo worker khi chưa cần jobs.

Xem [tiến độ và kết quả thực tế](docs/progress.md), [Phase 2 plan](docs/phase-2-plan.md),
[kiến trúc](docs/architecture.md), [database](docs/database.md), [API](docs/api.md).
Phase 2 được người dùng chuyển cho `nvtank <tuannguyen.120910@gmail.com>`;
commit timestamps dùng thời gian thực.
