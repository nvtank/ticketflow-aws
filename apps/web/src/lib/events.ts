import { z } from 'zod';
import { EVENT_CATEGORIES } from '@tixflow/shared';
import { eventListSchema } from './api-client';
export const eventStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'PUBLISHED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
]);
export const eventDetailSchema = eventListSchema.shape.items.element.extend({
  status: eventStatusSchema,
  description: z.string(),
  endsAt: z.iso.datetime(),
  salesStartAt: z.iso.datetime(),
  salesEndAt: z.iso.datetime(),
  ticketPolicy: z.string(),
  galleryUrls: z.array(z.url()),
  maxTicketsPerOrder: z.number().int(),
  inventoryRevision: z.number().int(),
  waitingRoomEnabled: z.boolean(),
  waitingRoomCapacity: z.number().int(),
  rejectionReason: z.string().nullable(),
  organization: z.object({ id: z.string(), name: z.string() }),
  venue: z.object({ id: z.string(), name: z.string(), city: z.string(), address: z.string() }),
  sections: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rowCount: z.number(),
      columnCount: z.number(),
      ticketType: z.object({ id: z.string(), name: z.string(), priceVnd: z.number() }),
      totalSeats: z.number(),
      availableSeats: z.number(),
      soldSeats: z.number(),
    }),
  ),
});
export type EventDetail = z.infer<typeof eventDetailSchema>;
export const managedEventListSchema = z.object({
  items: z.array(eventDetailSchema),
  pagination: eventListSchema.shape.pagination,
});
export const seatSnapshotSchema = z.object({
  eventId: z.string(),
  revision: z.number(),
  serverTime: z.iso.datetime(),
  seats: z.array(
    z.object({
      id: z.string(),
      sectionId: z.string(),
      code: z.string(),
      rowLabel: z.string(),
      columnNumber: z.number(),
      status: z.enum(['AVAILABLE', 'HELD', 'SOLD', 'UNAVAILABLE']),
      priceVnd: z.number(),
    }),
  ),
});
export const historySchema = z.array(
  z.object({
    id: z.string(),
    action: z.string(),
    createdAt: z.iso.datetime(),
    metadata: z.unknown(),
    actor: z.object({ name: z.string() }).nullable(),
  }),
);
export const eventFormSchema = z
  .object({
    organizationId: z.string().min(1, 'Chọn tổ chức.'),
    title: z
      .string()
      .trim()
      .min(3, 'Tên sự kiện cần ít nhất 3 ký tự.')
      .max(180, 'Tối đa 180 ký tự.'),
    description: z
      .string()
      .min(20, 'Mô tả cần ít nhất 20 ký tự.')
      .max(20000, 'Tối đa 20.000 ký tự.'),
    category: z.enum(EVENT_CATEGORIES),
    venueName: z.string().trim().min(2, 'Nhập tên địa điểm.').max(180, 'Tối đa 180 ký tự.'),
    address: z.string().min(3, 'Nhập địa chỉ đầy đủ.').max(500, 'Tối đa 500 ký tự.'),
    city: z.string().min(2, 'Nhập thành phố.').max(100, 'Tối đa 100 ký tự.'),
    startsAt: z.string().min(1, 'Nhập ngày giờ.'),
    endsAt: z.string().min(1, 'Nhập ngày giờ.'),
    salesStartAt: z.string().min(1, 'Nhập ngày giờ.'),
    salesEndAt: z.string().min(1, 'Nhập ngày giờ.'),
    coverUrl: z
      .string()
      .refine(
        (url) => !url || (z.url().safeParse(url).success && /^https?:/.test(url)),
        'Nhập URL ảnh http/https hợp lệ.',
      ),
    galleryUrls: z.string().refine(
      (value) =>
        value.split('\n').filter(Boolean).length <= 8 &&
        value
          .split('\n')
          .filter(Boolean)
          .every((url) => z.url().safeParse(url.trim()).success && /^https?:/.test(url.trim())),
      'Tối đa 8 URL ảnh http/https, mỗi dòng một ảnh.',
    ),
    ticketPolicy: z
      .string()
      .min(10, 'Chính sách cần ít nhất 10 ký tự.')
      .max(5000, 'Tối đa 5.000 ký tự.'),
    maxTicketsPerOrder: z
      .number({ error: 'Nhập số vé hợp lệ.' })
      .int('Nhập số nguyên.')
      .min(1, 'Ít nhất 1 vé.')
      .max(10, 'Tối đa 10 vé.'),
  })
  .superRefine((v, ctx) => {
    const start = new Date(v.startsAt + '+07:00'),
      end = new Date(v.endsAt + '+07:00'),
      saleStart = new Date(v.salesStartAt + '+07:00'),
      saleEnd = new Date(v.salesEndAt + '+07:00');
    if (
      start <= new Date() ||
      end <= start ||
      saleEnd <= saleStart ||
      saleEnd > start ||
      [start, end, saleStart, saleEnd].some((d) => Number.isNaN(d.getTime()))
    )
      ctx.addIssue({
        code: 'custom',
        path: ['startsAt'],
        message: 'Kiểm tra thứ tự ngày giờ và thời điểm mở/bán vé.',
      });
  });
export const statusLabel: Record<z.infer<typeof eventStatusSchema>, string> = {
  DRAFT: 'Bản nháp',
  PENDING_APPROVAL: 'Chờ duyệt',
  PUBLISHED: 'Đã công bố',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Đã kết thúc',
};
export const categoryLabel: Record<string, string> = {
  MUSIC: 'Âm nhạc',
  CONFERENCE: 'Hội nghị',
  WORKSHOP: 'Workshop',
  SPORTS: 'Thể thao',
  OTHER: 'Khác',
};
export const dateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const vnInput = (value: string) =>
  new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16);
