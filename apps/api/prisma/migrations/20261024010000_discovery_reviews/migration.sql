CREATE TABLE "Artist" (
  "id" UUID NOT NULL, "slug" VARCHAR(120) NOT NULL, "name" VARCHAR(100) NOT NULL,
  "genre" VARCHAR(60) NOT NULL, "tagline" VARCHAR(200) NOT NULL, "biography" TEXT NOT NULL,
  "color" VARCHAR(20) NOT NULL DEFAULT 'violet', "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT false, CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");
CREATE INDEX "Artist_isPublished_name_idx" ON "Artist"("isPublished", "name");
CREATE TABLE "EventArtist" (
  "eventId" UUID NOT NULL, "artistId" UUID NOT NULL,
  CONSTRAINT "EventArtist_pkey" PRIMARY KEY ("eventId", "artistId"),
  CONSTRAINT "EventArtist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EventArtist_artistId_idx" ON "EventArtist"("artistId");
CREATE TABLE "EventReview" (
  "id" UUID NOT NULL, "eventId" UUID NOT NULL, "authorId" UUID NOT NULL, "ticketId" UUID NOT NULL,
  "rating" INTEGER NOT NULL, "comment" VARCHAR(2000) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "EventReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "EventReview_comment_check" CHECK (char_length(btrim("comment")) BETWEEN 10 AND 2000),
  CONSTRAINT "EventReview_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventReview_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EventReview_eventId_authorId_key" ON "EventReview"("eventId", "authorId");
CREATE INDEX "EventReview_createdAt_id_idx" ON "EventReview"("createdAt", "id");
CREATE INDEX "EventReview_authorId_idx" ON "EventReview"("authorId");
CREATE INDEX "EventReview_ticketId_idx" ON "EventReview"("ticketId");
