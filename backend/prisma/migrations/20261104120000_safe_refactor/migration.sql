UPDATE "users"
SET "role" = 'employee'
WHERE "role" IS NULL
   OR LOWER("role") NOT IN ('admin', 'manager', 'employee');

UPDATE "users"
SET "username" = 'user_' || "user_id"
WHERE "username" IS NULL OR TRIM("username") = '';

DO $$
DECLARE
    rec RECORD;
    base_name TEXT;
    candidate TEXT;
    counter INT;
BEGIN
    FOR rec IN SELECT "user_id", "username" FROM "users" ORDER BY "user_id" ASC LOOP
        base_name := rec."username";
        candidate := base_name;
        counter := 1;

        WHILE EXISTS (
            SELECT 1 FROM "users"
            WHERE "username" = candidate
              AND "user_id" <> rec."user_id"
        ) LOOP
            candidate := base_name || '_' || rec."user_id" || '_' || counter;
            counter := counter + 1;
        END LOOP;

        IF candidate <> rec."username" THEN
            UPDATE "users"
            SET "username" = candidate
            WHERE "user_id" = rec."user_id";
        END IF;
    END LOOP;
END $$;

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