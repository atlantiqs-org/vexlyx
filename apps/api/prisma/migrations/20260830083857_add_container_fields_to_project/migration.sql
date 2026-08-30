-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "container_id" TEXT,
ADD COLUMN     "container_status" TEXT,
ADD COLUMN     "deployed_at" TIMESTAMP(3),
ADD COLUMN     "deployed_domain" TEXT,
ADD COLUMN     "internal_port" INTEGER;
