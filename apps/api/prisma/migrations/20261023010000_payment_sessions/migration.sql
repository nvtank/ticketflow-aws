BEGIN;
ALTER TABLE "Payment"
  ADD COLUMN "providerOrderCode" BIGINT,
  ADD COLUMN "idempotencyKey" UUID,
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMPTZ(3),
  ADD COLUMN "reconciledAt" TIMESTAMPTZ(3),
  ADD COLUMN "mockOutcome" VARCHAR(20),
  ADD COLUMN "mockDueAt" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "Payment_providerOrderCode_key" ON "Payment"("providerOrderCode");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE UNIQUE INDEX "Payment_orderId_provider_key" ON "Payment"("orderId", "provider");
CREATE INDEX "Payment_status_reconciledAt_idx" ON "Payment"("status", "reconciledAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_safe_order_code" CHECK ("providerOrderCode" IS NULL OR ("providerOrderCode" > 0 AND "providerOrderCode" <= 9007199254740991));
ALTER TABLE "Ticket" ADD COLUMN "qrVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebhookEvent" ADD COLUMN "outcome" VARCHAR(40), ADD COLUMN "paymentId" UUID;
COMMIT;
