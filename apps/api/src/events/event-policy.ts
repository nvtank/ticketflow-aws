import { BadRequestException, ConflictException } from '@nestjs/common';
import type { EventFieldsDto, SectionDto } from './events.dto';

export function validateDates(
  input: Pick<EventFieldsDto, 'startsAt' | 'endsAt' | 'salesStartAt' | 'salesEndAt'>,
  now = new Date(),
) {
  const start = new Date(input.startsAt),
    end = new Date(input.endsAt);
  const saleStart = new Date(input.salesStartAt),
    saleEnd = new Date(input.salesEndAt);
  if (
    [start, end, saleStart, saleEnd].some((date) => !Number.isFinite(date.getTime())) ||
    start <= now ||
    end <= start ||
    saleEnd <= saleStart ||
    saleEnd > start
  )
    throw new BadRequestException(
      'Thời gian không hợp lệ: sự kiện phải ở tương lai, kết thúc sau bắt đầu và bán vé kết thúc trước sự kiện.',
    );
}
export function assertEditable(status: string) {
  if (!['DRAFT', 'REJECTED'].includes(status))
    throw new ConflictException('Chỉ có thể chỉnh sửa sự kiện nháp hoặc bị từ chối.');
}
export function validateSections(sections: SectionDto[]) {
  if (sections.reduce((sum, s) => sum + s.rows * s.columns, 0) > 2000)
    throw new BadRequestException('MVP giới hạn 2.000 ghế mỗi sự kiện.');
  const names = sections.map((s) => s.name.trim().toLocaleLowerCase());
  if (new Set(names).size !== names.length || names.some((name) => !name))
    throw new BadRequestException('Tên khu vực phải khác nhau và không được trống.');
  const prices = new Map<string, number>();
  for (const section of sections) {
    const name = section.ticketName.trim();
    if (!name || (prices.has(name) && prices.get(name) !== section.priceVnd))
      throw new BadRequestException('Cùng loại vé phải có cùng giá.');
    prices.set(name, section.priceVnd);
  }
}
export function rowLabel(index: number): string {
  let label = '';
  let value = index + 1;
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}
