ALTER TABLE "sessions" ADD COLUMN "closedAt" TIMESTAMP(3);

UPDATE "sessions"
SET "closedAt" = "endDate",
    "endDate" = NULL
WHERE "status" = 'Finished'
  AND "endDate" IS NOT NULL;
