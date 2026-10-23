ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
CREATE TABLE "ExternalIdentity" (
 "id" UUID NOT NULL,
 "provider" VARCHAR(30) NOT NULL,
 "subject" VARCHAR(255) NOT NULL,
 "userId" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ExternalIdentity_subject_nonempty" CHECK (length("subject") > 0),
 CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExternalIdentity_provider_subject_key" ON "ExternalIdentity"("provider","subject");
CREATE UNIQUE INDEX "ExternalIdentity_userId_provider_key" ON "ExternalIdentity"("userId","provider");
