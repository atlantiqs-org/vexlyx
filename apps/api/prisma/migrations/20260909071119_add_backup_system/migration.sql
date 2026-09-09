-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BackupTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateTable
CREATE TABLE "backup_snapshots" (
    "id" TEXT NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "trigger" "BackupTrigger" NOT NULL,
    "archive_path" TEXT,
    "size_bytes" BIGINT,
    "manifest" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "schedule_cron" TEXT NOT NULL DEFAULT '0 3 * * *',
    "retention_daily" INTEGER NOT NULL DEFAULT 7,
    "retention_weekly" INTEGER NOT NULL DEFAULT 4,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backup_snapshots_status_idx" ON "backup_snapshots"("status");

-- CreateIndex
CREATE INDEX "backup_snapshots_created_at_idx" ON "backup_snapshots"("created_at");
