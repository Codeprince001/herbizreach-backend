-- CreateEnum
CREATE TYPE "TranslationSource" AS ENUM ('AI', 'MANUAL');

-- CreateTable
CREATE TABLE "platform_locales" (
    "code" TEXT NOT NULL,
    "label_english" TEXT NOT NULL,
    "label_native" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "platform_locales_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "product_translations" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "locale_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "name_source" "TranslationSource" NOT NULL,
    "description_source" "TranslationSource" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings_translations" (
    "id" UUID NOT NULL,
    "store_settings_id" UUID NOT NULL,
    "locale_code" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "tagline_source" "TranslationSource",
    "description_source" "TranslationSource",
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_translations_locale_code_idx" ON "product_translations"("locale_code");

-- CreateIndex
CREATE UNIQUE INDEX "product_translations_product_id_locale_code_key" ON "product_translations"("product_id", "locale_code");

-- CreateIndex
CREATE INDEX "store_settings_translations_locale_code_idx" ON "store_settings_translations"("locale_code");

-- CreateIndex
CREATE UNIQUE INDEX "store_settings_translations_store_settings_id_locale_code_key" ON "store_settings_translations"("store_settings_id", "locale_code");

-- AddForeignKey
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_locale_code_fkey" FOREIGN KEY ("locale_code") REFERENCES "platform_locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_settings_translations" ADD CONSTRAINT "store_settings_translations_store_settings_id_fkey" FOREIGN KEY ("store_settings_id") REFERENCES "store_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_settings_translations" ADD CONSTRAINT "store_settings_translations_locale_code_fkey" FOREIGN KEY ("locale_code") REFERENCES "platform_locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default optional storefront languages (English remains canonical on Product / StoreSettings).
INSERT INTO "platform_locales" ("code", "label_english", "label_native", "is_enabled", "sort_order") VALUES
('pcm', 'Nigerian Pidgin', 'Naija Pidgin', true, 10),
('yo', 'Yoruba', 'Yorùbá', true, 20),
('sw', 'Swahili', 'Kiswahili', true, 30),
('fr', 'French (WAEMU)', 'Français', true, 40)
ON CONFLICT ("code") DO NOTHING;
