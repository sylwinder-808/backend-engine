import { prisma } from "@/lib/prisma";

export const TransactionService = {
  async create(data: {
    userId: number;
    type: string;
    amount: number;
    beforeBalance: number;
    afterBalance: number;
    status: string;
    description?: string;
  }) {
    return prisma.transaction.create({
      data: {
        ...data,
        description: data.description ?? "", // 👈 FIX WAJIB
      },
    });
  },

  async findAll() {
    return prisma.transaction.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};