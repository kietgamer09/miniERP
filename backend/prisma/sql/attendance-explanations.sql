-- Bổ sung độc lập, không xóa/sửa bản ghi công hoặc bảng hiện có.
CREATE TABLE IF NOT EXISTS attendance_explanations (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
  date DATE NOT NULL,
  reason VARCHAR(2000) NOT NULL CHECK (char_length(trim(reason)) > 0),
  makeup_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note VARCHAR(2000),
  reviewed_by INTEGER REFERENCES users(user_id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT attendance_explanations_employee_id_date_key UNIQUE (employee_id, date)
);
CREATE INDEX IF NOT EXISTS attendance_explanations_status_date_idx ON attendance_explanations(status, date);
