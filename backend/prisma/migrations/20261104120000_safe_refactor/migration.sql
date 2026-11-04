UPDATE "users"
SET "role" = 'employee'
WHERE "role" IS NULL
   OR LOWER("role") NOT IN ('admin', 'manager', 'employee');

UPDATE "users"
SET "username" = 'user_' || "user_id"
WHERE "username" IS NULL OR TRIM("username") = '';

UPDATE "users" u1
SET "username" = u1."username" || '_' || u1."user_id"
FROM "users" u2
WHERE u1."user_id" > u2."user_id"
  AND u1."username" = u2."username";

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "manager_id" INTEGER;

UPDATE "departments"
SET "manager_id" = CAST("managment" AS INTEGER)
WHERE "managment" IS NOT NULL
  AND "managment" ~ '^[0-9]+$';

UPDATE "departments" d
SET "manager_id" = NULL
WHERE d."manager_id" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM "employees" e WHERE e."employee_id" = d."manager_id"
  );

ALTER TABLE "departments"
ADD CONSTRAINT "departments_manager_id_fkey"
FOREIGN KEY ("manager_id") REFERENCES "employees"("employee_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "departments" DROP COLUMN IF EXISTS "managment";