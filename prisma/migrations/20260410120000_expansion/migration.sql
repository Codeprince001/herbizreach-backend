CREATE TYPE "UserRole" AS ENUM ('OWNER', 'CUSTOMER', 'ADMIN');
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'ARCHIVED');
CREATE TYPE "MessageSenderType" AS ENUM ('OWNER', 'CUSTOMER', 'GUEST', 'SYSTEM');

ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'OWNER';
ALTER TABLE "users" ADD COLUMN "disabled_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);
ALTER TABLE "users" ALTER COLUMN "business_name" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "business_slug" DROP NOT NULL;

CREATE INDEX "users_role_idx" ON "users"("role");

ALTER TABLE "products" ADD COLUMN "sku" TEXT;
ALTER TABLE "products" ADD COLUMN "stock_quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" INTEGER;
ALTER TABLE "products" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "products_featured_idx" ON "products"("featured");

CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

CREATE TABLE "store_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "whatsapp_phone" TEXT,
    "banner_url" TEXT,
    "accent_color" TEXT,
    "tagline" TEXT,
    "show_chat_widget" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_settings_user_id_key" ON "store_settings"("user_id");

CREATE TABLE "product_categories" (
    "product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id","category_id")
);

CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_user_id" UUID NOT NULL,
    "customer_user_id" UUID,
    "guest_token" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversations_guest_token_key" ON "conversations"("guest_token");
CREATE INDEX "conversations_store_user_id_status_idx" ON "conversations"("store_user_id", "status");
CREATE INDEX "conversations_customer_user_id_idx" ON "conversations"("customer_user_id");

CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_type" "MessageSenderType" NOT NULL,
    "sender_user_id" UUID,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_user_id" UUID NOT NULL,
    "product_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leads_store_user_id_created_at_idx" ON "leads"("store_user_id", "created_at");

ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_store_user_id_fkey" FOREIGN KEY ("store_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leads" ADD CONSTRAINT "leads_store_user_id_fkey" FOREIGN KEY ("store_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
