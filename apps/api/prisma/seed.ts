import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@vexlyx.local" },
    update: {},
    create: {
      email: "admin@vexlyx.local",
      name: "Admin",
      password: "admin123",
      role: Role.ADMIN,
    },
  });

  console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
