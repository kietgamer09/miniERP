CREATE TABLE IF NOT EXISTS work_chats (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('direct', 'group')),
  name VARCHAR(100),
  direct_key VARCHAR(50) UNIQUE,
  owner_id INTEGER NOT NULL REFERENCES employees(employee_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'direct' AND direct_key IS NOT NULL) OR (kind = 'group' AND name IS NOT NULL AND direct_key IS NULL))
);
CREATE TABLE IF NOT EXISTS work_chat_members (
  chat_id INTEGER NOT NULL REFERENCES work_chats(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
  last_read_message_id INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, employee_id)
);
CREATE INDEX IF NOT EXISTS work_chat_members_employee_idx ON work_chat_members(employee_id, chat_id);
CREATE TABLE IF NOT EXISTS work_chat_messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES work_chats(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES employees(employee_id),
  content VARCHAR(4000),
  file_id UUID UNIQUE,
  file_name VARCHAR(180),
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((content IS NOT NULL AND length(trim(content)) > 0) OR file_id IS NOT NULL),
  CHECK (file_id IS NULL OR (file_name IS NOT NULL AND file_size > 0 AND file_size <= 10485760))
);
CREATE INDEX IF NOT EXISTS work_chat_messages_chat_idx ON work_chat_messages(chat_id, id);
ALTER TABLE work_chat_messages ALTER COLUMN content TYPE TEXT;
ALTER TABLE work_chat_messages ALTER COLUMN file_name TYPE TEXT;
ALTER TABLE work_chat_messages ADD COLUMN IF NOT EXISTS encryption_version SMALLINT NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS work_chat_security (
  employee_id INTEGER PRIMARY KEY REFERENCES employees(employee_id) ON DELETE CASCADE,
  pin_hash TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS work_chat_drafts (
  chat_id INTEGER NOT NULL REFERENCES work_chats(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  PRIMARY KEY (chat_id, employee_id)
);
