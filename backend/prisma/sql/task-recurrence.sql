ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_series_id UUID,
  ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(10),
  ADD COLUMN IF NOT EXISTS recurrence_anchor_day SMALLINT;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_recurrence_series_due_unique
  ON tasks (recurrence_series_id, due_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_recurrence_fields_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_recurrence_fields_check CHECK (
      (recurrence_frequency IS NULL AND recurrence_series_id IS NULL AND recurrence_anchor_day IS NULL)
      OR (recurrence_frequency IN ('daily', 'weekly', 'monthly')
        AND recurrence_series_id IS NOT NULL
        AND recurrence_anchor_day BETWEEN 1 AND 31)
    );
  END IF;
END $$;
