-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "ssh_private_key_path" TEXT,
ADD COLUMN     "ssh_public_key" TEXT,
ADD COLUMN     "webhook_secret" TEXT;
