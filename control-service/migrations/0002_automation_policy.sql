CREATE TABLE IF NOT EXISTS kt_automation_policy (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  auto_approve_devices INTEGER DEFAULT 0 NOT NULL CHECK (auto_approve_devices IN (0, 1)),
  auto_block_pending_devices INTEGER DEFAULT 0 NOT NULL CHECK (auto_block_pending_devices IN (0, 1)),
  pending_block_after_hours INTEGER DEFAULT 168 NOT NULL CHECK (pending_block_after_hours IN (24, 168, 720)),
  revision INTEGER DEFAULT 1 NOT NULL,
  updated_by TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT OR IGNORE INTO kt_automation_policy
  (id, auto_approve_devices, auto_block_pending_devices, pending_block_after_hours, revision)
VALUES (1, 0, 0, 168, 1);

CREATE TABLE IF NOT EXISTS kt_automation_commands (
  command_id TEXT PRIMARY KEY NOT NULL,
  payload_hash TEXT NOT NULL,
  state TEXT DEFAULT 'processing' NOT NULL,
  actor TEXT NOT NULL,
  control_device_id TEXT,
  execution_nonce TEXT NOT NULL,
  error_code TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS kt_automation_commands_created_idx
  ON kt_automation_commands(created_at DESC);
