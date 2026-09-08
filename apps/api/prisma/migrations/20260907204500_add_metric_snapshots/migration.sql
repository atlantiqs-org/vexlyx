-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "cpu_percent" DOUBLE PRECISION NOT NULL,
    "ram_used" BIGINT NOT NULL,
    "ram_total" BIGINT NOT NULL,
    "disk_used" BIGINT NOT NULL,
    "disk_total" BIGINT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metric_snapshots_recorded_at_idx" ON "metric_snapshots"("recorded_at");
