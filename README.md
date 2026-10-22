# TixFlow — Real-time Event Ticketing Platform

Nền tảng bán vé sự kiện được phát triển theo 7 phase. **Repository hiện triển khai
Phase 1: Project Setup & Design System**, chưa phải MVP bán vé hoàn chỉnh.
Chạy local, không dùng AWS hoặc yêu cầu AWS credentials.

## Yêu cầu

- Node.js **24 LTS** (`.nvmrc`), pnpm **10.34.1**.
- Docker Engine/Desktop có Docker Compose v2 để chạy PostgreSQL và Redis.
- Trên WSL: bật Docker Desktop WSL integration cho distro đang sử dụng, hoặc cài
  Docker Engine trong Linux. Node/pnpm và dependencies phải chạy trong cùng hệ điều hành;
  không dùng `node_modules` Windows cho Node Linux.

Các phiên bản đã resolve được lưu trong `pnpm-lock.yaml`: Next.js 16.4.2, React
19.3.1, NestJS 11.2.7, TypeScript 5.9.3, Tailwind CSS 4.3.3. Inter Variable được
đóng gói local, không gọi Google Fonts khi build. Nest CLI 11 cần bản `schema-utils`
4.3.3 tương thích Webpack; override được giải thích trong `pnpm-workspace.yaml`.
ESLint 9 hiện được giữ vì peer dependencies của các plugin React/Next chưa hỗ trợ
ESLint 10 đầy đủ. Không tắt strict peer dependency checks.

## Khởi chạy

Chạy tất cả lệnh từ thư mục gốc repository (thư mục này chính là `tixflow/` trong thiết kế).

```sh
npm install --global pnpm@10.34.1
pnpm install --frozen-lockfile
cp .env.example .env
```

Đặt mật khẩu local trong `POSTGRES_PASSWORD` và sửa `DATABASE_URL` cho khớp.
Nếu mật khẩu chứa ký tự đặc biệt, URL-encode phần password của `DATABASE_URL`.
Nếu thay đổi port database/Redis, cập nhật cả URL tương ứng. `.env` bị Git ignore.

```sh
docker compose --env-file .env -f infrastructure/docker-compose.yml config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d --wait
pnpm dev
```

`pnpm dev` build shared package trước, rồi chạy Next.js và NestJS đồng thời, có watch.
Sau khi sửa shared contracts, chạy lại `pnpm --filter @tixflow/shared build` để cập nhật
JavaScript sử dụng bởi backend. Các app đọc chung `.env` ở root qua dotenv-cli.

| Thành phần                   | Địa chỉ                                  |
| ---------------------------- | ---------------------------------------- |
| Frontend                     | http://localhost:3000                    |
| REST API                     | http://localhost:4000/api/v1             |
| Swagger                      | http://localhost:4000/api/docs           |
| Liveness                     | http://localhost:4000/api/v1/health/live |
| Readiness PostgreSQL + Redis | http://localhost:4000/api/v1/health      |
| Metrics tiến trình local     | http://localhost:4000/api/v1/metrics     |
| PostgreSQL                   | localhost:5432                           |
| Redis                        | localhost:6379                           |

Ứng dụng và containers bind loopback. Browser gọi `/api/v1` cùng origin; Next.js
proxy đến `API_INTERNAL_URL`. Giá trị proxy được cố định khi build; thay đổi URL
cần restart dev server hoặc build lại production. Không đưa secrets vào biến `NEXT_PUBLIC_*`.

```sh
# Build các workspace theo dependency order
pnpm build
# Sau đó chạy API và web trong hai terminal riêng
pnpm --filter @tixflow/api start
pnpm --filter @tixflow/web start

# Dừng containers, giữ dữ liệu
pnpm infra:down
```

`pnpm db:migrate`, `pnpm db:seed`, Prisma schema và tài khoản demo **chưa có ở
Phase 1**; sẽ được thêm ở Phase 2 cùng authentication. Không có credentials giả
hoặc nút Google Login chưa hoạt động. Nút đăng nhập hiện disabled.

## Các route hiện tại

- `/`: landing tiếng Việt, đồ họa sân khấu vector gốc, danh mục, public navigation/footer.
- `/events`: nền tảng tìm kiếm đồng bộ URL và trạng thái từ REST. Event API chưa được
  triển khai; phản hồi 404 hiển thị thông báo Phase 3 rõ ràng, không sinh event giả.
- `/system`: trạng thái kết nối API/PostgreSQL/Redis thực tế, refresh và toast.
- `/organizer`, `/staff`, `/admin`: bố cục dashboard responsive, sidebar/breadcrumb,
  thông báo bản xem trước và kết nối thật. Chưa có đăng nhập, quyền hoặc dữ liệu riêng tư.
- Loading skeleton, lỗi tải trang, global error và trang 404.

Reusable UI theo cấu trúc shadcn/ui: Button, Card, Input, Badge, Skeleton, Dialog,
EmptyState. Dialog dùng Radix để quản lý focus/keyboard. Tailwind CSS v4, Lucide,
TanStack Query, Zustand cho menu, Sonner, Zod và date-fns đã được kết nối. React
Hook Form/resolvers đã cài để dùng ở các form có nghiệp vụ từ Phase 2. Recharts,
Socket.IO, QR và worker sẽ được thêm khi triển khai chức năng tương ứng.

## Kiểm tra

```sh
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

Vitest build API/shared trước khi kiểm thử ứng dụng Nest thực qua HTTP. Các test
hiện có kiểm tra config, CORS, Helmet, correlation ID, rate limit, error redaction,
metrics, Swagger và trạng thái dependency không kết nối. PostgreSQL/Redis drivers
thực được trỏ đến port local đóng; **đây chưa phải transaction/concurrency tests**.
Không thay đổi dữ liệu database đang chạy của bạn.

Playwright build app và tự chạy backend/frontend trên 4000/3000; hãy dừng `pnpm dev`
trước khi chạy để tránh chiếm port. Chạy Chromium desktop và Pixel 7 viewport,
kiểm tra navigation, focus, URL search/history, lỗi/rỗng, health UI và dashboard
preview. Dịch vụ dependency được cố ý đặt không khả dụng để kiểm thử UI degraded.
Không mock REST responses trong E2E. Báo cáo ở `playwright-report/`; ảnh/trace trong
`test-results/` bị Git ignore. Kết quả thực tế và giới hạn được lưu tại
[docs/progress.md](docs/progress.md).

## Cấu trúc

```text
apps/
  api/src/
    common/http/       # Errors, correlation IDs, measured HTTP counters
    config/            # Validated environment
    health/            # Real PostgreSQL/Redis readiness
    monitoring/        # Local-only metrics
  api/test/
  web/src/
    app/(public)/      # Home, events, system
    app/(workspace)/   # Organizer, Staff, Admin layout previews
    components/        # UI, public/dashboard shells, query provider
    lib/               # Validated API client, formatting
    stores/            # UI state only
packages/
  shared/              # Types, constants, preparatory realtime contracts
  config/              # Strict TypeScript configuration
infrastructure/        # PostgreSQL/Redis Compose
e2e/                   # Playwright
docs/                  # Architecture, API, database plan, progress, commit plan
```

`apps/worker` chưa được tạo vì Phase 1 chưa có background jobs. Không tạo worker rỗng.

## Tiến độ và giới hạn

Phase 1 chưa cung cấp luồng mua vé. Authentication, Prisma migrations/seed,
event CRUD/approval, seat hold transaction, realtime, thanh toán, QR/check-in,
analytics và waiting room được thực hiện ở Phase 2–7 theo đúng thứ tự. Dashboard
không có số liệu hardcode. Chưa có kết quả load test hoặc tuyên bố về concurrency.

Theo dõi [kế hoạch 17 commit Phase 1](docs/phase-1-plan.md),
[tiến độ](docs/progress.md), [kiến trúc](docs/architecture.md),
[database](docs/database.md), [API](docs/api.md).

Phase owner: `hoangphatdev`, author được xác nhận trong phiên làm việc. Branch:
`feature/phase-1-foundation`. `main` và `develop` trỏ tới commit kế hoạch ban đầu;
code Phase 1 nằm trên feature branch để review. Không backdate, chưa push, mở PR
hoặc merge. Danh sách commit thực:

```sh
git log --reverse --format='%h %s' feature/phase-1-foundation
```
