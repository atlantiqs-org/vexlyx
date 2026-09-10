import type { PrismaClient } from "@prisma/client";

export type QuotaResource = "project" | "domain" | "database" | "mailbox" | "subAccount";

const QUOTA_RESOURCES: QuotaResource[] = ["project", "domain", "database", "mailbox", "subAccount"];

const QUOTA_FIELD: Record<QuotaResource, string> = {
  project: "maxProjects",
  domain: "maxDomains",
  database: "maxDatabases",
  mailbox: "maxMailboxes",
  subAccount: "maxSubAccounts",
};

export interface QuotaUsage {
  used: number;
  limit: number | null;
}

async function countExisting(prisma: PrismaClient, userId: string, resource: QuotaResource): Promise<number> {
  switch (resource) {
    case "project":
      return prisma.project.count({ where: { userId, status: { not: "DELETED" } } });
    case "domain":
      return prisma.domain.count({ where: { userId } });
    case "database":
      return prisma.database.count({ where: { userId } });
    case "mailbox":
      return prisma.mailbox.count({ where: { userId, status: { not: "DELETED" } } });
    case "subAccount":
      return prisma.user.count({ where: { resellerId: userId } });
  }
}

/**
 * Throws `err` (constructed via `makeError`) if creating one more `resource`
 * would put `userId` at or over their configured quota. A null quota field
 * means unlimited, so the check is skipped entirely.
 */
export async function assertUnderQuota(
  prisma: PrismaClient,
  userId: string,
  resource: QuotaResource,
  makeError: (message: string, code: string, statusCode: number) => Error,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { [QUOTA_FIELD[resource]]: true } as Record<string, true>,
  });

  const limit = (user as Record<string, number | null> | null)?.[QUOTA_FIELD[resource]] ?? null;
  if (limit === null || limit === undefined) return;

  const current = await countExisting(prisma, userId, resource);
  if (current >= limit) {
    throw makeError(
      `You have reached your ${resource} limit (${limit}). Contact your administrator to increase it.`,
      "QUOTA_EXCEEDED",
      403,
    );
  }
}

/**
 * Full used/limit breakdown across every quota'd resource for a user — the
 * data behind the "Your Plan" dashboard widget so users can see what
 * they're allowed before hitting a QUOTA_EXCEEDED error.
 */
export async function getUsageSummary(
  prisma: PrismaClient,
  userId: string,
): Promise<Record<QuotaResource, QuotaUsage>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      maxProjects: true,
      maxDomains: true,
      maxDatabases: true,
      maxMailboxes: true,
      maxSubAccounts: true,
    },
  });

  const limits = user as Record<string, number | null> | null;

  const entries = await Promise.all(
    QUOTA_RESOURCES.map(async (resource) => {
      const used = await countExisting(prisma, userId, resource);
      const limit = limits?.[QUOTA_FIELD[resource]] ?? null;
      return [resource, { used, limit }] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<QuotaResource, QuotaUsage>;
}
