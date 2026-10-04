export const API_PREFIX = '/api/v1';
export const DEFAULT_HOLD_SECONDS = 300;
export const MAX_TICKETS_PER_ORDER = 4;
export const DISPLAY_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ORGANIZER = 'ORGANIZER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'UNAVAILABLE';
export type OrderStatus =
  'PENDING_PAYMENT' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'PAYMENT_FAILED' | 'REFUND_REQUIRED';
export type TicketStatus = 'VALID' | 'USED' | 'CANCELLED';

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
  details?: string[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  city: string;
  venueName: string;
  startsAt: string;
  coverUrl: string | null;
  minPriceVnd: number;
  availableSeats: number;
}

export interface EventListResponse {
  items: EventSummary[];
  pagination: Pagination;
}

export type DependencyStatus = 'up' | 'down';
export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: 'tixflow-api';
  timestamp: string;
  uptimeSeconds: number;
  dependencies: { postgres: DependencyStatus; redis: DependencyStatus };
}

// Realtime payloads invalidate authoritative REST snapshots.
// Payloads invalidate REST snapshots; they never authorize a hold or purchase.
export type InventoryEventName = 'seat:held' | 'seat:released' | 'seat:sold' | 'inventory:updated';
export interface InventoryUpdate {
  eventId: string;
  seatIds: string[];
  revision: number;
  occurredAt: string;
}

export const EVENT_CATEGORIES = ['MUSIC', 'CONFERENCE', 'WORKSHOP', 'SPORTS', 'OTHER'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export type EventStatus =
  'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export interface EventSectionSummary {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  ticketType: { id: string; name: string; priceVnd: number };
  totalSeats: number;
  availableSeats: number;
  soldSeats: number;
}
export interface EventDetail extends EventSummary {
  status: EventStatus;
  description: string;
  endsAt: string;
  salesStartAt: string;
  salesEndAt: string;
  ticketPolicy: string;
  galleryUrls: string[];
  maxTicketsPerOrder: number;
  inventoryRevision: number;
  rejectionReason: string | null;
  organization: { id: string; name: string };
  venue: { id: string; name: string; address: string; city: string };
  sections: EventSectionSummary[];
}
export interface SeatSnapshot {
  eventId: string;
  revision: number;
  serverTime: string;
  seats: {
    id: string;
    sectionId: string;
    code: string;
    rowLabel: string;
    columnNumber: number;
    status: SeatStatus;
    priceVnd: number;
  }[];
}

export type BookingSeatStatus =
  'AVAILABLE' | 'HELD_BY_ME' | 'HELD_BY_OTHERS' | 'SOLD' | 'UNAVAILABLE';
export type HoldState = 'ACTIVE' | 'EXPIRED' | 'RELEASED';
export interface HoldView {
  id: string;
  eventId: string;
  seatIds: string[];
  state: HoldState;
  expiresAt: string;
  serverTime: string;
  orderId: string | null;
}
export interface BookingSnapshot {
  eventId: string;
  revision: number;
  serverTime: string;
  salesStartAt: string;
  salesEndAt: string;
  maxTicketsPerOrder: number;
  activeHold: HoldView | null;
  seats: (Omit<SeatSnapshot['seats'][number], 'status'> & { status: BookingSeatStatus })[];
}
export interface OrderView {
  id: string;
  eventId: string;
  holdId: string;
  status: OrderStatus;
  totalVnd: number;
  feeVnd: number;
  expiresAt: string;
  createdAt: string;
  serverTime: string;
  event: { title: string; slug: string; startsAt: string; venueName: string };
  items: { seatId: string; code: string; section: string; priceVnd: number }[];
}
export interface EventRoomAck {
  ok: boolean;
  eventId?: string;
  revision?: number;
  message?: string;
}
export interface RealtimeServerEvents {
  'seat:held': (update: InventoryUpdate) => void;
  'seat:released': (update: InventoryUpdate) => void;
  'seat:sold': (update: InventoryUpdate) => void;
  'inventory:updated': (update: InventoryUpdate) => void;
  'order:updated': (update: { orderId: string; eventId: string; status: OrderStatus }) => void;
}
export interface RealtimeClientEvents {
  'event:join': (input: { eventId: string }, acknowledge: (result: EventRoomAck) => void) => void;
}
