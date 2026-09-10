import { PrismaClient, Role } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await argon2.hash("admin123", {
    type: argon2.argon2id,
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@vexlyx.local" },
    update: { password: hashedPassword },
    create: {
      email: "admin@vexlyx.local",
      name: "Admin",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);

  const reseller = await prisma.user.upsert({
    where: { email: "reseller@vexlyx.local" },
    update: { password: hashedPassword },
    create: {
      email: "reseller@vexlyx.local",
      name: "Reseller",
      password: hashedPassword,
      role: Role.RESELLER,
      maxSubAccounts: 5,
    },
  });

  console.log(`Seeded reseller user: ${reseller.email} (id: ${reseller.id})`);

  const subAccount = await prisma.user.upsert({
    where: { email: "sub-account@vexlyx.local" },
    update: { password: hashedPassword, resellerId: reseller.id },
    create: {
      email: "sub-account@vexlyx.local",
      name: "Sub Account",
      password: hashedPassword,
      role: Role.USER,
      resellerId: reseller.id,
      maxProjects: 3,
    },
  });

  console.log(`Seeded sub-account user: ${subAccount.email} (id: ${subAccount.id})`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
