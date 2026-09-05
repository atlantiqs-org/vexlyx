-- CreateTable
CREATE TABLE "virtual_aliases" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "destinations" TEXT[],
    "is_catch_all" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "virtual_aliases_source_key" ON "virtual_aliases"("source");

-- CreateIndex
CREATE INDEX "virtual_aliases_user_id_idx" ON "virtual_aliases"("user_id");

-- CreateIndex
CREATE INDEX "virtual_aliases_domain_id_idx" ON "virtual_aliases"("domain_id");

-- AddForeignKey
ALTER TABLE "virtual_aliases" ADD CONSTRAINT "virtual_aliases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_aliases" ADD CONSTRAINT "virtual_aliases_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
