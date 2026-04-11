-- Optional product context when a buyer starts chat from a product page
ALTER TABLE "conversations" ADD COLUMN "product_id" UUID;

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "conversations_product_id_idx" ON "conversations"("product_id");
