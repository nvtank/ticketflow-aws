BEGIN;
ALTER TABLE "Event" ADD COLUMN "galleryUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "Venue_city_idx" ON "Venue"("city");
CREATE INDEX "TicketType_eventId_priceVnd_idx" ON "TicketType"("eventId", "priceVnd");
COMMIT;
