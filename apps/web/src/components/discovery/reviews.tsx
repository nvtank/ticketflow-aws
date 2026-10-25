'use client';
import Link from 'next/link';
import { BadgeCheck, MessageCircle, Star, Trash2, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiGet, apiRequest } from '@/lib/api-client';
import { reviewsSchema, reviewSchema, reviewContextSchema } from '@/lib/discovery';
import { useAuthState } from '@/stores/auth';
import { QueryNotice } from '@/components/ui/query-notice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      aria-label={`${rating} trên 5 sao`}
      className={cn('inline-flex gap-1 text-warning', className)}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={cn('size-3.5', value <= rating ? 'fill-current' : 'text-slate-200')}
        />
      ))}
    </span>
  );
}
export function ReviewFeed({ eventId, compact = false }: { eventId?: string; compact?: boolean }) {
  const [page, setPage] = useState(1),
    [rating, setRating] = useState(''),
    [sort, setSort] = useState('recent');
  const params = new URLSearchParams({ page: String(page), pageSize: compact ? '3' : '6', sort });
  if (eventId) params.set('eventId', eventId);
  if (rating) params.set('rating', rating);
  const query = useQuery({
    queryKey: ['reviews', params.toString()],
    queryFn: ({ signal }) =>
      apiGet(`/reviews?${params}`, reviewsSchema, { signal, anonymous: true }),
  });
  return (
    <div>
      {!compact && (
        <div className="mb-7 flex flex-wrap items-center gap-3">
          <label className="text-xs text-muted-foreground">
            Lọc đánh giá
            <select
              aria-label="Lọc theo số sao"
              value={rating}
              onChange={(event) => {
                setRating(event.target.value);
                setPage(1);
              }}
              className="ml-3 h-10 rounded-xl border bg-card px-3 text-sm text-foreground"
            >
              <option value="">Tất cả số sao</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} sao
                </option>
              ))}
            </select>
          </label>
          <select
            aria-label="Sắp xếp đánh giá"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border bg-card px-3 text-sm"
          >
            <option value="recent">Mới nhất</option>
            <option value="highest">Đánh giá cao nhất</option>
          </select>
        </div>
      )}
      {!query.data ? (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          {!compact && (
            <div className="mb-8 grid gap-8 rounded-2xl border bg-card p-6 sm:grid-cols-[1fr_2fr]">
              <div>
                <p className="text-xs text-muted-foreground">Trải nghiệm đặt vé</p>
                <p className="mt-2 text-5xl font-semibold tracking-tight">
                  {query.data.summary.average?.toFixed(1) ?? '—'}
                  <span className="ml-2 text-base text-muted-foreground">/ 5</span>
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {query.data.summary.count} đánh giá từ người mua vé
                </p>
              </div>
              <div className="space-y-2">
                {query.data.summary.distribution.map((row) => (
                  <div key={row.rating} className="flex items-center gap-3 text-xs">
                    <span className="w-9 shrink-0">{row.rating} sao</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${query.data.summary.count ? (row.count / query.data.summary.count) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-5 text-right text-muted-foreground">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {query.data.items.length ? (
            <div className={cn('grid gap-5', !eventId && 'md:grid-cols-2 lg:grid-cols-3')}>
              {query.data.items.map((review) => (
                <article key={review.id} className="rounded-2xl border bg-card p-6">
                  <Stars rating={review.rating} />
                  <p className="review-text mt-5 text-sm leading-7 text-foreground">
                    {review.comment}
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t pt-4">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary"
                      aria-hidden="true"
                    >
                      {review.author.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{review.author.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-success">
                        <BadgeCheck className="size-3" />
                        Đã mua vé ·{' '}
                        {new Date(review.createdAt).toLocaleDateString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/events/${review.event.slug}#reviews`}
                    className="mt-4 inline-flex items-center gap-1 text-xs leading-5 text-primary"
                  >
                    {review.event.title}
                    <ArrowUpRight className="size-3 shrink-0" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">
                {rating
                  ? 'Chưa có đánh giá với số sao này'
                  : 'Câu chuyện tiếp theo có thể là của bạn'}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                {rating
                  ? 'Chọn tất cả số sao để xem các chia sẻ khác.'
                  : 'Sau khi mua vé, hãy vào trang sự kiện và chia sẻ trải nghiệm đặt vé của bạn. Mỗi góp ý đều có ý nghĩa.'}
              </p>
              {!eventId && (
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/events">
                    Khám phá sự kiện
                    <ArrowUpRight />
                  </Link>
                </Button>
              )}
            </div>
          )}
          {!compact && query.data.pagination.totalPages > 1 && (
            <nav
              aria-label="Phân trang đánh giá"
              className="mt-7 flex items-center justify-center gap-4"
            >
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Trang trước
              </Button>
              <span className="text-sm">
                {page}/{query.data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= query.data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
const formSchema = z.object({
  rating: z.number().int().min(1, 'Chọn số sao của bạn.').max(5),
  comment: z
    .string()
    .trim()
    .min(10, 'Chia sẻ ít nhất 10 ký tự nhé.')
    .max(2000, 'Tối đa 2.000 ký tự.'),
});
type ReviewFormData = z.infer<typeof formSchema>;
function ReviewForm({
  eventId,
  review,
  editable = true,
}: {
  eventId: string;
  review: z.infer<typeof reviewSchema> | null;
  editable?: boolean;
}) {
  const client = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { rating: review?.rating ?? 5, comment: review?.comment ?? '' },
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['reviews'] });
    await client.invalidateQueries({ queryKey: ['review-context', eventId] });
  };
  const save = useMutation({
    mutationFn: (data: ReviewFormData) =>
      apiRequest('PUT', `/events/${eventId}/review`, reviewSchema, data),
    onSuccess: async () => {
      toast.success('Đã lưu chia sẻ của bạn. Cảm ơn bạn!');
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: () =>
      apiRequest('DELETE', `/reviews/${review!.id}`, z.object({ deleted: z.boolean() })),
    onSuccess: async () => {
      setConfirmDelete(false);
      toast.success('Đã xóa đánh giá.');
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="mb-8 rounded-2xl border border-primary/30 bg-card p-6">
      <h3 className="text-lg font-semibold">
        {review ? 'Chỉnh sửa đánh giá của bạn' : 'Trải nghiệm đặt vé của bạn thế nào?'}
      </h3>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        {editable
          ? 'Chia sẻ về việc chọn ghế, thanh toán và nhận vé. Vui lòng không đăng thông tin cá nhân hoặc mã QR.'
          : 'Đánh giá này không còn hiển thị công khai vì vé không đủ điều kiện. Bạn vẫn có thể xóa nội dung của mình.'}
      </p>
      <form className="mt-5" onSubmit={handleSubmit((data) => save.mutate(data))}>
        <fieldset disabled={!editable}>
          <legend className="mb-3 text-sm font-medium">Mức độ hài lòng</legend>
          <div className="flex gap-2">
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value} className="cursor-pointer">
                      <input
                        type="radio"
                        name={field.name}
                        value={value}
                        checked={field.value === value}
                        onChange={() => field.onChange(value)}
                        onBlur={field.onBlur}
                        ref={value === 1 ? field.ref : undefined}
                        className="peer sr-only"
                      />
                      <span className="flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs text-muted-foreground peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                        {value}
                        <Star aria-hidden="true" className="size-3" />
                        <span className="sr-only">sao</span>
                      </span>
                    </label>
                  ))}
                </>
              )}
            />
          </div>
        </fieldset>
        {errors.rating && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {errors.rating.message}
          </p>
        )}
        <label htmlFor="review-comment" className="mt-5 mb-2 block text-sm font-medium">
          Nội dung đánh giá
        </label>
        <textarea
          id="review-comment"
          disabled={!editable}
          {...register('comment')}
          maxLength={2000}
          rows={4}
          className="w-full resize-y rounded-xl border bg-background p-3 text-sm leading-7"
          placeholder="Điều gì đã khiến trải nghiệm của bạn tốt hơn?"
          aria-invalid={!!errors.comment}
        />
        {errors.comment && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {errors.comment.message}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {editable && (
            <Button type="submit" disabled={save.isPending || remove.isPending}>
              {save.isPending ? 'Đang lưu…' : review ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
            </Button>
          )}
          {review && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={save.isPending || remove.isPending}
            >
              <Trash2 />
              Xóa đánh giá
            </Button>
          )}
        </div>
        {save.error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {save.error.message}
          </p>
        )}
      </form>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle className="text-lg font-bold">Xóa đánh giá này?</DialogTitle>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            Đánh giá sẽ được gỡ khỏi trang sự kiện và cộng đồng.
          </DialogDescription>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Giữ lại
            </Button>
            <Button disabled={remove.isPending} onClick={() => remove.mutate()}>
              {remove.isPending ? 'Đang xóa…' : 'Xác nhận xóa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function EventReviews({ eventId, slug }: { eventId: string; slug: string }) {
  const user = useAuthState((state) => state.user);
  const context = useQuery({
    queryKey: ['review-context', eventId, user?.id],
    enabled: !!user,
    queryFn: ({ signal }) =>
      apiGet(`/events/${eventId}/review-context`, reviewContextSchema, { signal }),
  });
  return (
    <section id="reviews" className="pt-4">
      <div className="mb-6">
        <p className="eyebrow">Lắng nghe trải nghiệm thật</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">Đánh giá & chia sẻ</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Cảm nhận về hành trình đặt vé từ những người đã mua vé sự kiện này.
        </p>
      </div>
      {!user ? (
        <p className="mb-6 rounded-xl bg-primary/10 p-4 text-sm leading-7 text-foreground">
          <Link
            href={`/login?next=${encodeURIComponent(`/events/${slug}#reviews`)}`}
            className="font-semibold underline"
          >
            Đăng nhập
          </Link>{' '}
          để chia sẻ sau khi mua vé.
        </p>
      ) : context.isError ? (
        <QueryNotice pending={false} error={context.error} retry={() => void context.refetch()} />
      ) : context.isPending ? (
        <p role="status" className="mb-6 text-xs text-muted-foreground">
          Đang xác minh vé của bạn…
        </p>
      ) : context.data?.eligible || context.data?.review ? (
        <ReviewForm
          key={context.data.review?.updatedAt ?? 'new'}
          eventId={eventId}
          review={context.data.review}
          editable={context.data.eligible}
        />
      ) : (
        <p className="mb-6 text-xs leading-6 text-muted-foreground">
          Bạn có thể đánh giá khi có vé đã thanh toán, còn hợp lệ của sự kiện.
        </p>
      )}
      <ReviewFeed eventId={eventId} />
    </section>
  );
}
