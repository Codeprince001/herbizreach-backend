-- FCM registration tokens for push notifications (per user device)
CREATE TABLE "user_fcm_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_fcm_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_fcm_tokens_token_key" ON "user_fcm_tokens"("token");

CREATE INDEX "user_fcm_tokens_user_id_idx" ON "user_fcm_tokens"("user_id");

ALTER TABLE "user_fcm_tokens" ADD CONSTRAINT "user_fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
