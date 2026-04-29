-- Expand phase for legacy + rust coexistence
CREATE TABLE IF NOT EXISTS "api_migration_control" (
  "id" TEXT PRIMARY KEY,
  "domain" TEXT NOT NULL,
  "read_path" TEXT NOT NULL DEFAULT 'legacy',
  "write_path" TEXT NOT NULL DEFAULT 'legacy',
  "rollout_percentage" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id" TEXT PRIMARY KEY,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "outbox_events_created_at_idx" ON "outbox_events" ("created_at");
