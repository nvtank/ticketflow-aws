# Trình thiết kế chỗ ngồi

## Sử dụng

1. Đăng nhập tài khoản nhà tổ chức của tổ chức đã được duyệt.
2. Vào **Nhà tổ chức → Sự kiện → Tạo sự kiện**, điền thông tin và lưu bản nháp.
3. Trong **Thiết kế chỗ ngồi**, tạo zone, đặt tên, màu và giá vé VND cho mỗi ghế.
4. Chọn zone rồi kéo mẫu dãy ghế vào mặt bằng, hoặc bấm mẫu để thêm tự động vào khoảng trống. Có mẫu 6, 10, 12 ghế và khối 3 × 8.
5. Kéo dãy ghế/sân khấu để bố trí; chọn dãy để sửa số hàng, ghế mỗi hàng, tọa độ, góc xoay hoặc đổi zone. Có nhân bản, xóa, hoàn tác và làm lại.
6. Mở **Khóa ghế không mở bán** để vô hiệu hóa từng vị trí. Tổng ghế mở bán và số lượng từng zone cập nhật ngay. Đổi số hàng/cột sẽ mở lại ghế khóa của dãy đó.
7. **Vừa khung** để xem tổng thể, **+/−** để phóng to/thu nhỏ. Trên điện thoại, bật **Cuộn mặt bằng** để lướt sơ đồ; tắt để kéo ghế. Bàn phím: Enter chọn dãy, mũi tên di chuyển 10 đơn vị, Shift + mũi tên 50 đơn vị.
8. **Lưu sơ đồ**, sau đó **Gửi duyệt sự kiện**. Thay đổi chưa lưu sẽ chặn nút gửi duyệt và cảnh báo khi tải lại/đóng tab. Dữ liệu nháp chưa lưu không được lưu tự động.

Sơ đồ đã lưu xuất hiện trên trang chi tiết cho khách hàng và người duyệt. Bước chọn ghế dùng cùng vị trí, góc xoay, mã ghế và giá zone, với trạng thái ghế từ API/realtime hiện có. Ghế đang chọn chỉ được giữ sau khi máy chủ xác nhận.

## Giới hạn và bảo toàn giao dịch

- 1–8 zone, 1–80 khối ghế, tối đa 2.000 vị trí mỗi sự kiện.
- Mỗi khối: 1–26 hàng, 1–40 ghế/hàng. Zone có thể chứa nhiều khối với kích thước khác nhau. Mỗi zone phải có ít nhất một ghế mở bán.
- Giá vé nguyên VND từ 0 đến 100.000.000, tên zone khác nhau; màu và giá riêng cho từng zone.
- Mặt bằng rộng 800–6.000 và cao 600–6.000 đơn vị. Kiểm tra hình chữ nhật xoay để chặn khối chồng nhau, đè lên sân khấu hoặc nằm ngoài mặt bằng.
- Chỉ sửa sự kiện DRAFT/REJECTED. Thay thế sơ đồ bị chặn nếu có đơn hàng, lịch sử giữ ghế, ghế SOLD hoặc HELD, kể cả khi sự kiện ở trạng thái nháp.
- Lưu thay thế toàn bộ inventory trong một transaction có khóa event. `expectedRevision` ngăn lượt lưu cũ ghi đè lượt lưu mới. Mã hàng được máy chủ sinh theo thứ tự khối; mã ghế là duy nhất trong sự kiện. ID inventory được tạo lại khi thay sơ đồ nháp.
- Giá order lấy từ TicketType trên máy chủ; client không cung cấp giá thanh toán. Thao tác lưu được ghi vào audit log.
- Sơ đồ cũ vẫn dùng grid cũ ở trang đặt vé. Organizer có thể chuyển sơ đồ nháp cũ sang canvas; ghế bị vô hiệu được giữ khi chuyển. API tạo grid cũ vẫn hoạt động và xóa metadata canvas cũ khi tạo lại.

## Lưu trữ và API

Migration `20261028000000_seat_layout` thêm cột nullable `Event.seatMapLayout` JSONB. Không thay đổi dữ liệu sự kiện cũ. Chạy `pnpm db:migrate` sau khi cập nhật code; khởi động lại API.

`POST /api/v1/organizer/events/:id/seat-map/design` nhận:

```json
{
  "version": 1,
  "expectedRevision": 0,
  "width": 2400,
  "height": 1800,
  "stage": { "x": 900, "y": 80, "width": 600, "height": 160 },
  "zones": [{ "id": "vip", "name": "VIP", "priceVnd": 1200000, "color": "#7c3aed" }],
  "blocks": [
    {
      "id": "row-1",
      "zoneId": "vip",
      "x": 900,
      "y": 400,
      "rotation": 0,
      "rows": 2,
      "columns": 10,
      "disabledSeats": [0]
    }
  ]
}
```

`disabledSeats` là index từ 0, theo hàng rồi cột. Response là event detail, trong đó zone ID được thay bằng EventSection ID thật và mỗi khối có `rowLabels` do máy chủ sinh. Không gửi `rowLabels` hoặc trạng thái SOLD/HELD trong request thiết kế.

## Kiểm thử

- `apps/api/test/seat-design.test.ts`: geometry xoay, bounds, overlap, mã hàng, zone, số ghế, DTO và dữ liệu khóa ghế.
- `apps/api/test/events.integration.test.ts`: PostgreSQL/Redis riêng ở cổng 55432/56379; kiểm tra quyền, lưu/tải lại, rollback dữ liệu sai, revision/race, khóa khi gửi duyệt/có giao dịch, giữ ghế và tổng giá order qua API thật.
- `pnpm test:e2e:seating-ui`: cần web chạy ở cổng 3000; dữ liệu mô phỏng chỉ trong trình duyệt. Kiểm tra thiết kế ở 1440/390/320px, kéo chuột/cảm ứng, bàn phím, khóa ghế, hoàn tác, overlap, lỗi lưu, lưu lần đầu/thay thế, reload, layout khóa và lựa chọn ghế/giá ở booking. Ảnh và kết quả ở `/tmp/tixflow-seat-designer`.
- `e2e/events.spec.ts`: luồng tạo sự kiện → thiết kế hai zone → gửi duyệt → từ chối/sửa → công bố đã cập nhật để dùng designer mới.

Chạy kiểm thử backend sau `pnpm --filter @tixflow/shared build` và `pnpm --filter @tixflow/api build`. Không chạy các integration fixture lên database phát triển; cấu hình test kiểm tra tên database và cổng trước khi ghi.
