import { API_PREFIX } from '@tixflow/shared';
import { z } from 'zod';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: { signal?: AbortSignal; acceptDegraded?: boolean },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiClientError('Không kết nối được máy chủ. Kiểm tra API local và thử lại.', 0);
  }
  const requestId = response.headers.get('X-Request-ID') ?? undefined;
  if (!response.ok && !(options?.acceptDegraded && response.status === 503)) {
    throw new ApiClientError(
      response.status === 404
        ? 'Chức năng này chưa được mở trong Phase 1.'
        : 'Không thể tải dữ liệu. Vui lòng thử lại.',
      response.status,
      requestId,
    );
  }
  const raw: unknown = await response.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new ApiClientError('Máy chủ chưa trả về dữ liệu hợp lệ.', response.status, requestId);
  return parsed.data;
}

export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('tixflow-api'),
  timestamp: z.iso.datetime(),
  uptimeSeconds: z.number().nonnegative(),
  dependencies: z.object({ postgres: z.enum(['up', 'down']), redis: z.enum(['up', 'down']) }),
});

export const eventListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      category: z.string(),
      city: z.string(),
      venueName: z.string(),
      startsAt: z.iso.datetime(),
      coverUrl: z.url().nullable(),
      minPriceVnd: z.number().int().nonnegative(),
      availableSeats: z.number().int().nonnegative(),
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
