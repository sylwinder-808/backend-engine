import { prisma } from "@/lib/prisma";

export const WalletService = {
  async get(userId: number) {
    return prisma.wallet.findUnique({
      where: { userId },
    });
  },

  async increment(userId: number, amount: number) {
    return prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  },

  async decrement(userId: number, amount: number) {
    return prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });
  },
};