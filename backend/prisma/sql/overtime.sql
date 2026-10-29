CREATE TABLE IF NOT EXISTS work_overtime_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
  department_id INTEGER NOT NULL REFERENCES departments(department_id),
  mode TEXT NOT NULL CHECK (mode IN ('past', 'planned')),
  overtime_date DATE NOT NULL,
  start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute INTEGER NOT NULL CHECK (end_minute BETWEEN 0 AND 1439),
  end_next_day BOOLEAN NOT NULL DEFAULT false,
  total_minutes INTEGER GENERATED ALWAYS AS (end_minute + CASE WHEN end_next_day THEN 1440 ELSE 0 END - start_minute) STORED,
  reason VARCHAR(2000) NOT NULL CHECK (length(trim(reason)) > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by INTEGER REFERENCES employees(employee_id),
  review_note VARCHAR(1000),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (total_minutes > 0 AND total_minutes <= 1440)
);
CREATE INDEX IF NOT EXISTS work_overtime_employee_idx ON work_overtime_requests(employee_id, overtime_date);
CREATE INDEX IF NOT EXISTS work_overtime_review_idx ON work_overtime_requests(status, department_id, overtime_date);
CREATE TABLE IF NOT EXISTS work_overtime_notifications (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES work_overtime_requests(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('review', 'result')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, employee_id, event)
);
CREATE INDEX IF NOT EXISTS work_overtime_notifications_employee_idx ON work_overtime_notifications(employee_id, read_at, created_at);
