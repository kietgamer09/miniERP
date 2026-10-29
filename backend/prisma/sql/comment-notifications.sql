CREATE TABLE IF NOT EXISTS work_project_comments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES employees(employee_id),
  content VARCHAR(2000) NOT NULL CHECK (length(btrim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_project_comments_project_idx ON work_project_comments(project_id, created_at);
CREATE TABLE IF NOT EXISTS work_comment_reads (
  employee_id INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('task', 'project')),
  comment_id INTEGER NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, kind, comment_id)
);
