'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiGet, apiRequest } from '@/lib/api-client';
import {
  eventFormSchema,
  eventDetailSchema,
  vnInput,
  categoryLabel,
  type EventDetail,
} from '@/lib/events';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QueryNotice } from './event-detail';
const organizationsSchema = z.array(
  z.object({ id: z.string(), name: z.string(), status: z.string() }),
);
const fieldClass =
  'w-full rounded-xl border bg-white px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-primary';
type Values = z.infer<typeof eventFormSchema>;
export function EventEditor({ event }: { event?: EventDetail }) {
  const router = useRouter(),
    cache = useQueryClient();
  const organizations = useQuery({
    queryKey: ['organizations', 'mine'],
    queryFn: () => apiGet('/organizations/me', organizationsSchema),
  });
  const [baseTime] = useState(() => Date.now());
  const future = (days: number) => vnInput(new Date(baseTime + days * 86400000).toISOString());
  const form = useForm<Values>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event
      ? {
          organizationId: event.organization.id,
          title: event.title,
          description: event.description,
          category: event.category as Values['category'],
          venueName: event.venue.name,
          address: event.venue.address,
          city: event.city,
          startsAt: vnInput(event.startsAt),
          endsAt: vnInput(event.endsAt),
          salesStartAt: vnInput(event.salesStartAt),
          salesEndAt: vnInput(event.salesEndAt),
          coverUrl: event.coverUrl ?? '',
          galleryUrls: event.galleryUrls.join('\n'),
          ticketPolicy: event.ticketPolicy,
          maxTicketsPerOrder: event.maxTicketsPerOrder,
        }
      : {
          organizationId: '',
          title: '',
          description: '',
          category: 'MUSIC',
          venueName: '',
          address: '',
          city: '',
          startsAt: future(30),
          endsAt: future(31),
          salesStartAt: future(1),
          salesEndAt: future(29),
          coverUrl: '',
          galleryUrls: '',
          ticketPolicy: '',
          maxTicketsPerOrder: 4,
        },
  });
  const save = useMutation({
    mutationFn: (values: Values) => {
      const input = {
        title: values.title,
        description: values.description,
        category: values.category,
        venue: { name: values.venueName, address: values.address, city: values.city },
        startsAt: new Date(values.startsAt + '+07:00').toISOString(),
        endsAt: new Date(values.endsAt + '+07:00').toISOString(),
        salesStartAt: new Date(values.salesStartAt + '+07:00').toISOString(),
        salesEndAt: new Date(values.salesEndAt + '+07:00').toISOString(),
        coverUrl: values.coverUrl || null,
        galleryUrls: values.galleryUrls
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        ticketPolicy: values.ticketPolicy,
        maxTicketsPerOrder: values.maxTicketsPerOrder,
      };
      return event
        ? apiRequest('PATCH', `/organizer/events/${event.id}`, eventDetailSchema, input)
        : apiRequest('POST', '/organizer/events', eventDetailSchema, {
            ...input,
            organizationId: values.organizationId,
          });
    },
    onSuccess: async (saved) => {
      toast.success('Đã lưu bản nháp sự kiện.');
      await cache.invalidateQueries({ queryKey: ['organizer'] });
      router.push(`/organizer/events/${saved.id}`);
    },
    onError: (error) => toast.error(error.message),
  });
  if (!organizations.data)
    return (
      <QueryNotice
        pending={organizations.isPending}
        error={organizations.error}
        retry={() => void organizations.refetch()}
      />
    );
  const text = (key: keyof Values, label: string, type = 'text') => (
    <div key={key}>
      <label htmlFor={key} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <Input
        id={key}
        type={type}
        {...form.register(key, { valueAsNumber: type === 'number' })}
        aria-invalid={!!form.formState.errors[key]}
        aria-describedby={`${key}-error`}
      />
      <p id={`${key}-error`} className="mt-1 text-xs text-red-600">
        {form.formState.errors[key]?.message}
      </p>
    </div>
  );
  const area = (key: 'description' | 'ticketPolicy' | 'galleryUrls', label: string) => (
    <div>
      <label htmlFor={key} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={key}
        rows={key === 'description' ? 6 : 3}
        className={fieldClass}
        {...form.register(key)}
        aria-invalid={!!form.formState.errors[key]}
        aria-describedby={`${key}-error`}
      />
      <p id={`${key}-error`} className="mt-1 text-xs text-red-600">
        {form.formState.errors[key]?.message}
      </p>
    </div>
  );
  return (
    <Card>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        className="space-y-6"
      >
        <div>
          <label htmlFor="organizationId" className="block text-sm font-medium">
            Tổ chức
          </label>
          <select
            id="organizationId"
            aria-describedby="organizationId-error"
            {...form.register('organizationId')}
            disabled={!!event}
            className={fieldClass + ' mt-2'}
          >
            <option value="">Chọn tổ chức đã được duyệt</option>
            {organizations.data
              .filter((o) => o.status === 'APPROVED')
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
          <span id="organizationId-error" className="mt-1 block text-xs text-red-600">
            {form.formState.errors.organizationId?.message}
          </span>
        </div>
        {text('title', 'Tên sự kiện')}
        <div>
          <label htmlFor="category" className="block text-sm font-medium">
            Danh mục
          </label>
          <select id="category" {...form.register('category')} className={fieldClass + ' mt-2'}>
            {Object.entries(categoryLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {area('description', 'Mô tả sự kiện')}
        <div className="grid gap-5 sm:grid-cols-2">
          {text('venueName', 'Tên địa điểm')}
          {text('city', 'Thành phố')}
          {text('address', 'Địa chỉ')}
        </div>
        <p className="text-sm text-muted-foreground">Ngày giờ theo múi giờ Việt Nam (UTC+7).</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {text('startsAt', 'Bắt đầu sự kiện', 'datetime-local')}
          {text('endsAt', 'Kết thúc sự kiện', 'datetime-local')}
          {text('salesStartAt', 'Bắt đầu bán vé', 'datetime-local')}
          {text('salesEndAt', 'Kết thúc bán vé', 'datetime-local')}
        </div>
        {text('coverUrl', 'URL ảnh bìa', 'url')}
        {area('galleryUrls', 'Ảnh giới thiệu (mỗi dòng một URL http/https)')}
        {area('ticketPolicy', 'Chính sách mua và hoàn vé')}
        {text('maxTicketsPerOrder', 'Số vé tối đa mỗi đơn', 'number')}
        <p className="text-xs text-muted-foreground">
          Lưu nháp chưa công bố sự kiện. Cấu hình ghế rồi gửi duyệt ở bước tiếp theo.
        </p>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Đang lưu…' : 'Lưu bản nháp'}
        </Button>
      </form>
    </Card>
  );
}
