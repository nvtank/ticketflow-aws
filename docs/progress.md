# Tiến độ TixFlow

Cập nhật: 22/10/2026, múi giờ Asia/Ho_Chi_Minh. Timeline 20/09–22/10 trong đề bài là
kế hoạch; lịch sử Git dùng thời điểm thực tế, không backdate.

## Phase 1 — Project Setup & Design System

**Source code và các kiểm tra ứng dụng đã hoàn tất. Xác minh khởi chạy containers
còn chờ Docker daemon của môi trường local. Chưa tuyên bố MVP hoàn thành.**

Phụ trách: `hoangphatdev`. Người dùng đã xác nhận author
`hoangphatdev <latruonghoangphat@gmail.com>`. Tổng cộng 17 commit có nội dung thực
khi bao gồm commit tài liệu cuối. Branch: `feature/phase-1-foundation`.
`main`/`develop` giữ baseline kế hoạch `4d7bee4`; chưa push, tạo PR hoặc merge.

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
| PostgreSQL/Redis container startup | CHƯA XÁC MINH: Docker daemon không chạy                                |
| GitHub Actions                     | Config đã viết; chưa push nên chưa có kết quả CI remote                |
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

1. Bật/cài Docker daemon hoặc Docker Desktop WSL integration, chạy Compose và kiểm tra
   `/system`: PostgreSQL/Redis phải hiển thị đã kết nối trước khi bắt đầu Phase 2.
2. Phase 2: Prisma schema/migration/seed, tài khoản demo, password hashing, JWT,
   refresh session thu hồi được trong HttpOnly cookie, RBAC và bảo vệ route.
3. Phase 3: event CRUD/approval, organization ownership và seat grid generator.
4. Phase 4 ưu tiên transaction/concurrency trước realtime; phải kiểm thử thật 20/100
   requests, atomic multi-seat, expiration và ownership trên database/Redis test.
5. Các phase payment, ticket QR, atomic check-in, analytics và waiting room chưa triển khai.

Không có migration/seed giả, endpoint auth/booking giả, doanh thu hardcode hoặc
đánh giá khả năng phục vụ 1.000 người. Dashboard hiện là public UI previews với
thông báo rõ ràng, chưa phải portal được bảo vệ.

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
