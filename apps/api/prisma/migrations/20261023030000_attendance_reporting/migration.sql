ALTER TABLE "Event" ADD COLUMN "checkInRevision" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "CheckIn_createdAt_idx" ON "CheckIn"("createdAt");
CREATE INDEX "Order_status_paidAt_idx" ON "Order"("status", "paidAt");
