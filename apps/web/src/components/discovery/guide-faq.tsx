'use client';
import { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
const questions = [
  {
    title: 'Chọn ghế có nghĩa là tôi đã giữ được ghế chưa?',
    answer:
      'Chưa. Bạn cần bấm xác nhận giữ ghế và nhận thông báo thành công. Lúc này thời gian giữ chỗ mới bắt đầu. Nếu người khác vừa giữ ghế đó, bạn sẽ được thông báo để chọn vị trí khác.',
  },
  {
    title: 'Tôi có bao lâu để thanh toán?',
    answer:
      'Thời gian giữ chỗ mặc định là 5 phút. Hãy theo dõi đồng hồ trên trang chọn ghế và thanh toán. Khi hết hạn, chỗ ngồi có thể được mở lại cho người khác; bạn cần bắt đầu lượt giữ chỗ mới.',
  },
  {
    title: 'Tôi xem vé và mã QR ở đâu?',
    answer:
      'Sau khi hệ thống xác nhận thanh toán thành công, vào “Vé của tôi”, chọn vé để mở mã QR và thông tin ghế. Không chia sẻ hình ảnh mã QR công khai vì vé chỉ được check-in một lần.',
  },
  {
    title: 'Thanh toán xong nhưng chưa thấy vé thì sao?',
    answer:
      'Mở lại trang đơn hàng để kiểm tra trạng thái. Việc quay về trang kết quả chưa có nghĩa thanh toán đã được xác nhận. Trường hợp thanh toán đến sau khi hết hạn giữ ghế sẽ cần xử lý riêng và không tự động phát hành vé.',
  },
  {
    title: 'Tại sao tôi phải vào phòng chờ?',
    answer:
      'Một số sự kiện sử dụng phòng chờ để giới hạn số người đặt vé cùng lúc. Giữ trang mở và chờ đến lượt. Vào được khu đặt vé không bảo đảm còn ghế; hãy kiểm tra sơ đồ khi được cấp quyền vào.',
  },
  {
    title: 'Ai có thể viết đánh giá trên TixFlow?',
    answer:
      'Người đã đăng nhập và có vé đã thanh toán, còn hợp lệ của sự kiện có thể đánh giá trải nghiệm đặt vé. Mỗi người có một đánh giá cho mỗi sự kiện, có thể cập nhật hoặc xóa. Nội dung tập trung vào quá trình đặt và nhận vé, không phải xác nhận đã tham dự một sự kiện chưa diễn ra.',
  },
  {
    title: 'Các sự kiện và nghệ sĩ demo có diễn ra thật không?',
    answer:
      'TixFlow hiện là dự án chạy local. Sự kiện trong dữ liệu mẫu và nghệ sĩ có nhãn Demo phục vụ kiểm thử và khám phá sản phẩm, không phải lịch biểu diễn hay thông báo bán vé thực tế.',
  },
];
export function GuideFaq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion();
  return (
    <div className="divide-y rounded-2xl border bg-white px-5 md:px-8">
      {questions.map((question, index) => (
        <div key={question.title}>
          <h3>
            <button
              id={`faq-question-${index}`}
              aria-expanded={open === index}
              aria-controls={`faq-answer-${index}`}
              onClick={() => setOpen(open === index ? null : index)}
              className="flex w-full items-center justify-between gap-5 py-6 text-left text-sm leading-6 font-semibold"
            >
              {question.title}
              {open === index ? (
                <Minus className="size-4 shrink-0 text-primary" />
              ) : (
                <Plus className="size-4 shrink-0 text-primary" />
              )}
            </button>
          </h3>
          <AnimatePresence initial={false}>
            {open === index && (
              <m.div
                key="answer"
                id={`faq-answer-${index}`}
                role="region"
                aria-labelledby={`faq-question-${index}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.25 }}
                className="overflow-hidden"
              >
                <p className="pb-6 pr-5 text-sm leading-8 text-muted-foreground">
                  {question.answer}
                </p>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
