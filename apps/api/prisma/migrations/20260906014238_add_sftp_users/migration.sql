-- CreateTable
CREATE TABLE "sftp_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "linux_username" TEXT NOT NULL,
    "encrypted_password" TEXT,
    "ssh_public_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sftp_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sftp_users_user_id_key" ON "sftp_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sftp_users_linux_username_key" ON "sftp_users"("linux_username");

-- CreateIndex
CREATE INDEX "sftp_users_user_id_idx" ON "sftp_users"("user_id");

-- AddForeignKey
ALTER TABLE "sftp_users" ADD CONSTRAINT "sftp_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
