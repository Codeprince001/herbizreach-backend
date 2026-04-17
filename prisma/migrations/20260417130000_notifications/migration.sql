-- In-app notifications (per user)
CREATE TYPE "NotificationType" AS ENUM (
  'SYSTEM',
  'LEAD',
  'CHAT',
  'PRODUCT',
  'STORE',
  'SECURITY',
  'BILLING',
  'MARKETING'
);

CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "body" TEXT,
  "action_url" TEXT,
  "entity_type" TEXT,
  "entity_id" UUID,
  "metadata" JSONB,
  "read_at" TIMESTAMP(3),
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_user_id_archived_at_idx" ON "notifications"("user_id", "archived_at");
