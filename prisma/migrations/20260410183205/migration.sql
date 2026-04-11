-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "conversations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "store_settings" ALTER COLUMN "id" DROP DEFAULT;
