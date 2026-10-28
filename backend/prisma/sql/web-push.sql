CREATE TABLE IF NOT EXISTS work_push_subscriptions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  endpoint VARCHAR(2048) NOT NULL UNIQUE,
  p256dh VARCHAR(100) NOT NULL,
  auth VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_push_employee_idx ON work_push_subscriptions(employee_id);
CREATE TABLE IF NOT EXISTS work_push_deliveries (
  subscription_id INTEGER NOT NULL REFERENCES work_push_subscriptions(id) ON DELETE CASCADE,
  kind VARCHAR(10) NOT NULL,
  comment_id INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  PRIMARY KEY (subscription_id, kind, comment_id)
);
