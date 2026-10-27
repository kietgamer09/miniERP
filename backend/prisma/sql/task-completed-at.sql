ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

UPDATE "tasks"
SET "completed_at" = "updated_at"
WHERE "status" = 'xong' AND "completed_at" IS NULL;
