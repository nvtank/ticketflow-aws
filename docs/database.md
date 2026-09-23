# Database foundation and next steps

Phase 1 configures PostgreSQL 17 in Compose and verifies readiness using a real
query. **No business schema, Prisma migration, seed or demo accounts exist yet.**
The health connection is operational infrastructure, not a repository layer for
ticketing. Prisma will replace direct SQL in business modules starting Phase 2;
raw SQL remains appropriate for row locks/conditional reservation operations.

Phase 2 schema planning covers User, Organization, OrganizationMember, Venue,
Event, EventSection, TicketType, Seat, SeatHold, Order, OrderItem, Payment, Ticket,
CheckIn, EventStaffAssignment, WaitingRoomSession, Notification, AuditLog and
WebhookEvent. Implement each relation with foreign keys, indexes and constraints,
rather than relying on client validation.

Required invariants for later migrations:

- Internal UUID IDs. Integer VND prices, UTC timestamps, Vietnam display timezone.
- Each event belongs to one organization; membership restricts organizer access.
- Each seat belongs to an event/section with a unique event + seat code.
- One active valid ticket per seat and one ticket per purchased order item.
- A hold is only valid before server expiration and for its owner. Acquire seat
  locks in sorted order; rollback the entire group on conflict.
- Unique order idempotency keys scoped to owner and unique provider transaction
  references/webhook event identities.
- Ticket issuance, seat sale and order payment settle in one database transaction.
- Check-in requires assigned staff, matching event and a conditional transition
  from VALID to USED. Store one check-in record per ticket.
- Cleanup can only release expired held seats; it must never release SOLD seats.

Seeds will use dates relative to execution and named local demo users. Database
integration/concurrency tests need dedicated real PostgreSQL and Redis instances;
current foundation tests do not prove these future invariants.
