-- CreateEnum
CREATE TYPE "DkimKeyStatus" AS ENUM ('ACTIVE', 'RETIRING', 'RETIRED');

-- CreateTable
CREATE TABLE "dkim_keys" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "status" "DkimKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "public_key" TEXT NOT NULL,
    "key_length" INTEGER NOT NULL DEFAULT 2048,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "dkim_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dkim_keys_domain_id_idx" ON "dkim_keys"("domain_id");

-- CreateIndex
CREATE INDEX "dkim_keys_user_id_idx" ON "dkim_keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dkim_keys_domain_id_selector_key" ON "dkim_keys"("domain_id", "selector");

-- AddForeignKey
ALTER TABLE "dkim_keys" ADD CONSTRAINT "dkim_keys_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dkim_keys" ADD CONSTRAINT "dkim_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
