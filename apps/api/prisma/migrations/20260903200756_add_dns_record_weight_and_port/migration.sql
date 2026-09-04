-- AlterTable
ALTER TABLE "dns_records" ADD COLUMN     "port" INTEGER,
ADD COLUMN     "weight" INTEGER;
