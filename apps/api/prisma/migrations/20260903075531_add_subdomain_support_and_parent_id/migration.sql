-- AlterTable
ALTER TABLE "domains" ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "path_prefix" TEXT;

-- CreateIndex
CREATE INDEX "domains_parent_id_idx" ON "domains"("parent_id");

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
