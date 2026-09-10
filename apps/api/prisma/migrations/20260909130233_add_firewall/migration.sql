-- CreateEnum
CREATE TYPE "FirewallProtocol" AS ENUM ('TCP', 'UDP');

-- CreateEnum
CREATE TYPE "FirewallAction" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "FirewallPolicy" AS ENUM ('ALLOW', 'DENY');

-- CreateTable
CREATE TABLE "firewall_rules" (
    "id" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "protocol" "FirewallProtocol" NOT NULL,
    "source" TEXT,
    "action" "FirewallAction" NOT NULL,
    "comment" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firewall_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firewall_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "default_incoming" "FirewallPolicy" NOT NULL DEFAULT 'DENY',
    "default_outgoing" "FirewallPolicy" NOT NULL DEFAULT 'ALLOW',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firewall_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "firewall_rules_port_protocol_idx" ON "firewall_rules"("port", "protocol");
