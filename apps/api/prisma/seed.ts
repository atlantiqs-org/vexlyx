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
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
