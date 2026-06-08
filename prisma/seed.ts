import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const exists = await prisma.user.findFirst({
    where: {
      role: Role.SUPER_ADMIN,
    },
  });

  if (exists) {
    console.log("Super admin already exists");
    return;
  }

  const password = await bcrypt.hash(
    "login123",
    10
  );

  const user = await prisma.user.create({
    data: {
      username: "ADMIN",
      email: "admin@system.com",
      phone: "-",
      password,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log("SUPER ADMIN CREATED");
  console.log(user);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });