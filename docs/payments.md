# PayOS payments and QR tickets — Phase 5

Local PayOS integration uses official `@payos/node` 2.0.5. SDK request/response and
webhook signatures are verified. No AWS service or credential is involved.

## Configure locally

Run `pnpm env:setup` (or `pnpm env:setup -- --upgrade` for an existing file), then
edit the ignored root `.env`. Never put channel secrets into NEXT_PUBLIC variables.

```dotenv
PAYMENT_PROVIDER=payos
PAYOS_CLIENT_ID=<your channel client ID>
PAYOS_API_KEY=<your channel API key>
PAYOS_CHECKSUM_KEY=<your channel checksum key>
PAYMENT_RETURN_ORIGIN=http://localhost:3000
PAYMENT_RECONCILE_INTERVAL_MS=15000
TICKET_SIGNING_KEY=<persistent random key, at least 48 characters>
```

The user's channel credentials are configured in the current local environment;
their values are absent from Git, docs and logs. `PAYMENT_PROVIDER=disabled` is the
clean-install default. The UI shows unavailability until configured.

Keep TICKET_SIGNING_KEY across restarts. Changing it does not silently regenerate
valid credentials for previously issued tickets. Development/test can derive a
separate ticket key from JWT_SECRET when no ticket key is set; production requires
an explicit persistent key, HTTPS return origin and forbids mock payment.

Start PostgreSQL/Redis, migrate, seed, then `pnpm dev`. Open a published event as a
CUSTOMER, confirm seats and continue to the order. “Thanh toán qua PayOS” creates
or recovers the same PayOS request and redirects to its verified checkout URL.
Creating a payment never extends the original five-minute hold.

## Webhook for a local API

PayOS cannot call localhost. Expose API port 4000 through an HTTPS domain/tunnel
when available, preserving `/api/v1/payments/webhook`. Then explicitly run:

```sh
pnpm payos:webhook:register -- https://your-public-domain/api/v1/payments/webhook
```

This command changes the channel's registered webhook URL and asks PayOS to verify
it with a sample request. Run it only for the channel/domain you intend to use.
The API verifies the sample signature and acknowledges unknown order codes without
issuing tickets. No public webhook URL has been registered by this phase's local
work. The registration helper has a syntax check, not a live registration test.

Without a public URL, owner status requests and the local reconciliation loop query
PayOS directly using the official SDK. This is trusted server-to-server evidence;
return URL flags (`code`, `status`, `cancel`) are ignored for settlement decisions.
A browser redirect cannot create a PAID order or ticket.

## Transaction and retry rules

1. Lock event KEY SHARE → customer advisory lock → sorted seat UUIDs → hold → order.
   Create one stable payment attempt per order; a retry key cannot move to another
   order. Changing provider while an attempt exists is rejected.
2. Commit before calling PayOS. The random safe-integer orderCode is persisted and
   reused for ambiguous create retries. The SDK recovers a prior link by that code.
3. A verified callback/status result locks the order/seat context and payment,
   deduplicates provider event/reference, and checks link, currency, exact server
   amount, original expiry, current order state and HELD ownership.
4. Eligible payment atomically marks seats SOLD, clears holdId, issues one signed QR
   ticket per order item, marks PAID/SUCCEEDED and writes audit/notification/revision.
   Only after commit are Socket.IO inventory/order hints published.
5. Expired/cancelled orders, mismatched money/currency, or reclaimed seats produce
   REFUND_REQUIRED without selling seats or issuing tickets. A late callback never
   takes seats from a newer hold or paid order. Failed/cancelled payments release
   remaining own held seats; cleanup still never releases SOLD inventory.
6. Distinct extra transfers after a paid settlement require refund review while
   preserving valid issued tickets. Settlement references from a signed status
   response prevent treating its matching webhook as extra money. The same event
   reference with changed contents is rejected, not processed again.

No refund is executed automatically. Partial/overpayments require manual review;
automatic issuance supports an exact settlement amount. A status query can observe
an UNDERPAID link as pending, while a partial-transfer webhook conservatively marks
review. This MVP does not implement accumulation/reallocation of partial transfers.
Pending local status reads are claimed in DB at most once per five seconds per
payment. Each API's scheduler scans up to 20 pending payments every 15 seconds;
requests occur outside DB transactions. Metrics/throttles remain process-local.

A durable outbox, email delivery and automatic refund adapter are not implemented.
A crash after commit may lose a socket hint; authoritative REST snapshots recover it.

## Ticket credentials

`tf1.<random ticket UUID>.<HMAC>` contains no name/email/price or client-declared
seat rights. PostgreSQL stores only its SHA-256 hash plus credential version.
The backend can regenerate the credential for its authenticated owner and checks
that its hash matches. Ticket endpoints set Cache-Control: no-store. Only VALID
owned tickets display usable QR; USED/CANCELLED and historical version-zero tickets
show their actual state. Local seed upgrades only the two known demo version-zero
tickets when a signing key exists. STAFF check-in will use signature/hash plus
current DB status/assignment in Phase 6; QR presentation alone does not check in.

## Tests and actual external verification

Integration tests use isolated PostgreSQL 55432 and Redis 56379. PayOS callback
fixtures use the real SDK verifier and independent HMAC signing with test-only
keys; no live bank callback is claimed. Development-only MockPaymentProvider
exercises the same order/finalization/ticket transaction through authenticated APIs:
success, failed, cancelled, delayed (10 seconds) and duplicate callback.

PayOS real-channel create → signed GET PENDING → cancel → backend CANCELLED was
observed on 23/10/2026. Server amount matched; no money was transferred. Evidence
is in ignored `.local/phase-5-payos-live-evidence.json`. This does not prove a real
bank transfer or publicly delivered webhook; those remain unverified until a
public HTTPS endpoint and actual transfer are available.

- [Official Node SDK](https://payos.vn/docs/sdks/back-end/node/)
- [SDK source and migration guide](https://github.com/payOSHQ/payos-lib-node)
- [PayOS API and webhook format](https://payos.vn/docs/api/)
