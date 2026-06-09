import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const UserService = {
  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        bankAccount: true,
      },
    });
  },

  async findAll(role?: Role) {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      include: {
        wallet: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async update(id: number, data: any) {
    return prisma.user.update({
      where: { id },
      data,
    });
  },
};