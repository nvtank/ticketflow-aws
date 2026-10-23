import type { AdmissionOutcome } from '@tixflow/shared';
export const admissionMessages: Record<AdmissionOutcome, string> = {
  VALID: 'Vé hợp lệ, sẵn sàng check-in.',
  ALREADY_USED: 'Vé đã được sử dụng.',
  WRONG_EVENT: 'Vé không thuộc sự kiện này.',
  CANCELLED: 'Vé đã bị hủy.',
  INVALID: 'Mã vé không hợp lệ.',
  EVENT_UNAVAILABLE: 'Sự kiện hiện không cho phép check-in.',
  CHECKED_IN: 'Check-in thành công.',
};
export function admissionOutcome(
  ticket: { eventId: string; status: string } | null,
  eventId: string,
  open: boolean,
): AdmissionOutcome {
  if (!open) return 'EVENT_UNAVAILABLE';
  if (!ticket) return 'INVALID';
  if (ticket.eventId !== eventId) return 'WRONG_EVENT';
  if (ticket.status === 'USED') return 'ALREADY_USED';
  if (ticket.status === 'CANCELLED') return 'CANCELLED';
  return ticket.status === 'VALID' ? 'VALID' : 'INVALID';
}
