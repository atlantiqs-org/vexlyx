-- Baseline migration: captures the `certificates` table (F3.x SSL feature),
-- which already exists in this database via an earlier `db push` but was
-- never recorded in migration history. This file intentionally matches the
-- live schema exactly and is marked as already-applied via
-- `prisma migrate resolve --applied`, not run against the database.

-- CreateEnum
CREATE TYPE "public"."CertStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."CertType" AS ENUM ('LETS_ENCRYPT', 'CUSTOM', 'SELF_SIGNED');

-- CreateTable
CREATE TABLE "public"."certificates" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "type" "public"."CertType" NOT NULL DEFAULT 'LETS_ENCRYPT',
    "status" "public"."CertStatus" NOT NULL DEFAULT 'PENDING',
    "issuer" TEXT,
    "common_name" TEXT NOT NULL,
    "sans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "force_https" BOOLEAN NOT NULL DEFAULT true,
    "cert_path" TEXT,
    "key_path" TEXT,
    "encrypted_key" TEXT,
    "serial_number" TEXT,
    "error_message" TEXT,
    "last_checked_at" TIMESTAMP(3),
    "last_renewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_domain_id_key" ON "public"."certificates"("domain_id" ASC);

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "public"."certificates"("status" ASC);

-- CreateIndex
CREATE INDEX "certificates_valid_to_idx" ON "public"."certificates"("valid_to" ASC);

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
