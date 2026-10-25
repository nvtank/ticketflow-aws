import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
export function BookingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol
      aria-label="Tiến trình đặt vé"
      className="mb-8 flex items-center gap-2 rounded-2xl border bg-card p-4 sm:gap-5 sm:p-5"
    >
      {['Chọn ghế', 'Thanh toán', 'Nhận vé'].map((label, index) => (
        <li
          key={label}
          aria-current={current === index + 1 ? 'step' : undefined}
          className={cn(
            'flex flex-1 items-center gap-2 text-[10px] sm:gap-3 sm:text-xs',
            current >= index + 1 ? 'font-semibold text-primary' : 'text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full sm:size-8',
              current > index + 1
                ? 'bg-primary text-primary-foreground'
                : current === index + 1
                  ? 'bg-primary/15'
                  : 'bg-muted',
            )}
          >
            {current > index + 1 ? <Check className="size-3.5" /> : `0${index + 1}`}
          </span>
          {label}
          {index < 2 && (
            <span aria-hidden="true" className="ml-auto hidden h-px flex-1 bg-border sm:block" />
          )}
        </li>
      ))}
    </ol>
  );
}
