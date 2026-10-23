ALTER TABLE "SeatHold" ADD COLUMN "idempotencyKey" VARCHAR(100),
ADD COLUMN "requestedSeatIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
UPDATE "SeatHold" h SET "requestedSeatIds" = ARRAY(
  SELECT s."id" FROM "Seat" s WHERE s."holdId" = h."id"
  UNION
  SELECT i."seatId" FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId" WHERE o."holdId" = h."id"
  ORDER BY 1
);
CREATE UNIQUE INDEX "SeatHold_userId_idempotencyKey_key" ON "SeatHold"("userId", "idempotencyKey");
CREATE INDEX "SeatHold_eventId_userId_releasedAt_expiresAt_idx" ON "SeatHold"("eventId", "userId", "releasedAt", "expiresAt");
