import { z } from 'zod';
import { eventListSchema } from './api-client';
export const paginationSchema = eventListSchema.shape.pagination;
const count = z.number().int().nonnegative();
export const staffEventsSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      startsAt: z.iso.datetime(),
      status: z.string(),
      venueName: z.string(),
      totalTickets: count,
      checkedIn: count,
    }),
  ),
});
export const attendanceSchema = z.object({
  eventId: z.uuid(),
  revision: count,
  serverTime: z.iso.datetime(),
  totalTickets: count,
  checkedIn: count,
  remaining: count,
  cancelled: count,
  hourly: z.array(z.object({ label: z.string(), count })),
});
export const admissionSchema = z.object({
  outcome: z.enum([
    'VALID',
    'ALREADY_USED',
    'WRONG_EVENT',
    'CANCELLED',
    'INVALID',
    'EVENT_UNAVAILABLE',
    'CHECKED_IN',
  ]),
  message: z.string(),
  ticket: z
    .object({
      id: z.uuid(),
      code: z.string(),
      seatCode: z.string(),
      section: z.string(),
      status: z.enum(['VALID', 'USED', 'CANCELLED']),
      checkedInAt: z.iso.datetime().nullable(),
    })
    .nullable(),
});
export const analyticsSchema = z.object({
  from: z.string(),
  to: z.string(),
  timezone: z.string(),
  totalEvents: count,
  paidOrders: count,
  revenueVnd: count,
  soldTickets: count,
  availableSeats: count,
  heldSeats: count,
  soldSeats: count,
  capacity: count,
  occupancy: z.number(),
  checkIns: count,
  revenueByDay: z.array(z.object({ date: z.string(), revenueVnd: count, orders: count })),
  sections: z.array(
    z.object({
      eventId: z.uuid(),
      eventTitle: z.string(),
      section: z.string(),
      sold: count,
      available: count,
      checkedIn: count,
    }),
  ),
  recentOrders: z.array(
    z.object({
      id: z.uuid(),
      eventTitle: z.string(),
      totalVnd: count,
      createdAt: z.iso.datetime(),
      status: z.string(),
    }),
  ),
});
export const adminDashboardSchema = z.object({
  users: count,
  organizations: count,
  events: count,
  pendingEvents: count,
  pendingOrganizations: count,
  revenueVnd: count,
  paidOrders: count,
  tickets: count,
  checkIns: count,
  refundRequired: count,
});
export const adminUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  phone: z.string().nullable(),
  role: z.enum(['CUSTOMER', 'ORGANIZER', 'STAFF', 'ADMIN']),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
});
export const adminUsersSchema = z.object({
  items: z.array(adminUserSchema),
  pagination: paginationSchema,
});
export const organizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export const organizationsSchema = z.object({
  items: z.array(organizationSchema),
  pagination: paginationSchema,
});
export const monitorSchema = z
  .object({
    scope: z.string(),
    uptimeSeconds: count,
    httpRequestsTotal: count,
    httpErrorsTotal: count,
    requestsByStatus: z.record(z.string(), count),
    seatHoldsSucceeded: count,
    seatHoldsFailed: count,
    socketConnections: count,
    redisAdapterEnabled: z.boolean(),
    validHeldSeats: count,
    queue: z.null(),
  })
  .passthrough();
