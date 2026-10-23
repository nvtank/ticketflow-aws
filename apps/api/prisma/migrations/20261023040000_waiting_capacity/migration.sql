ALTER TABLE "Event" ADD COLUMN "waitingRoomCapacity" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Event" ADD CONSTRAINT "Event_waiting_capacity" CHECK ("waitingRoomCapacity" BETWEEN 1 AND 500);
