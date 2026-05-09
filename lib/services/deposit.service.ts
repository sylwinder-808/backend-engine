import { prisma } from "@/lib/prisma";

export const DepositService = {
  async createRequest(userId: number, amount: number) {
    return prisma.deposit.create({
      data: {
        userId,
        amount,
        status: "pending",
      },
    });
  },

  async findPending() {
    return prisma.deposit.findMany({
      where: { status: "pending" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async approve(id: number) {
    return prisma.deposit.update({
      where: { id },
      data: { status: "approved" },
    });
  },

  async reject(id: number) {
    return prisma.deposit.update({
      where: { id },
      data: { status: "rejected" },
    });
  },
};