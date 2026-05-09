import { prisma } from "@/lib/prisma";

export const LedgerService = {
  async getBalance(userId: number) {
    const ledgers = await prisma.ledger.findMany({
      where: { userId },
    });

    return ledgers.reduce((sum, l) => {
      return l.direction === "credit"
        ? sum + l.amount
        : sum - l.amount;
    }, 0);
  },
};