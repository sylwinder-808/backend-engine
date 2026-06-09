import { prisma } from "@/lib/prisma";

export const DepositService = {
  async createRequest(userId: number, amount: number) {
    return prisma.deposit.create({
      data: {
        userId,
        amount,
        status: "PENDING",
      },
    });
  },

  async findPending() {
    return prisma.deposit.findMany({
      where: { status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async approve(id: number) {
    return prisma.deposit.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  },

  async reject(id: number) {
    return prisma.deposit.update({
      where: { id },
      data: { status: "REJECTED" },
    });
  },
};