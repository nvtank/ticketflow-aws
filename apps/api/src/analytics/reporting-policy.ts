import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
export function reportRange(from: string | undefined, to: string | undefined, now: Date) {
  const today = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  to ??= today;
  from ??= new Date(Date.parse(today + 'T00:00:00Z') - 29 * 86400000).toISOString().slice(0, 10);
  if (!z.iso.date().safeParse(from).success || !z.iso.date().safeParse(to).success)
    throw new BadRequestException('Ngày báo cáo không hợp lệ.');
  const start = new Date(from + 'T00:00:00+07:00'),
    end = new Date(Date.parse(to + 'T00:00:00+07:00') + 86400000);
  if (end <= start || end.getTime() - start.getTime() > 366 * 86400000)
    throw new BadRequestException('Khoảng ngày phải tăng dần và không vượt 366 ngày.');
  return { from, to, start, end };
}
export function reportNumber(value: bigint | number | null) {
  const n = Number(value ?? 0);
  if (!Number.isSafeInteger(n)) throw new Error('Aggregate exceeds safe integer range.');
  return n;
}
