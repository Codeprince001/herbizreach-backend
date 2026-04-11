-- Multi-image products: migrate single image_url to image_urls array
ALTER TABLE "products" ADD COLUMN "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "products" SET "image_urls" = ARRAY["image_url"]::TEXT[];

ALTER TABLE "products" DROP COLUMN "image_url";
