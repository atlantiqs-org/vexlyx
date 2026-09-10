-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RESELLER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "max_databases" INTEGER,
ADD COLUMN     "max_domains" INTEGER,
ADD COLUMN     "max_mailboxes" INTEGER,
ADD COLUMN     "max_projects" INTEGER,
ADD COLUMN     "max_sub_accounts" INTEGER,
ADD COLUMN     "reseller_id" TEXT;

-- CreateIndex
CREATE INDEX "users_reseller_id_idx" ON "users"("reseller_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
