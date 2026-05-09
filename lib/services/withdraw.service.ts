import { prisma } from "@/lib/prisma";

export const WithdrawService = {
  async reject(id: number, adminId: number, reason?: string) {
    return prisma.$transaction(async (tx) => {
      // 1. ambil withdraw
      const withdraw = await tx.withdrawal.findUnique({
        where: { id },
        include: {
          user: {
            include: { wallet: true },
          },
        },
      });

      if (!withdraw || withdraw.status !== "pending") {
        throw new Error("Invalid withdrawal");
      }

      // 2. SAFE NULL HANDLING (IMPORTANT)
      const wallet = withdraw.user.wallet;
      const beforeBalance = wallet?.balance ?? 0;

      const refundAmount = withdraw.amount;
      const afterBalance = beforeBalance + refundAmount;

      // 3. update withdraw status
      await tx.withdrawal.update({
        where: { id },
        data: { status: "rejected" },
      });

      // 4. refund wallet (ensure wallet exists)
      if (!wallet) {
        throw new Error("Wallet not found for user");
      }

      await tx.wallet.update({
        where: { userId: withdraw.userId },
        data: {
          balance: {
            increment: refundAmount,
          },
        },
      });

      // 5. transaction log (PRISMA SAFE)
      await tx.transaction.create({
        data: {
          userId: withdraw.userId,
          type: "withdraw_rejected_refund",
          amount: refundAmount,
          beforeBalance,
          afterBalance,
          status: "success",
          description: reason ?? "Withdraw rejected and refunded",
        },
      });

      // 6. admin log
      await tx.adminLog.create({
        data: {
          adminId,
          action: "withdraw_reject",
          targetId: withdraw.id,
          meta: {
            amount: refundAmount,
            reason: reason ?? null,
          } as any, // Prisma JSON safe fix
        },
      });

      return {
        success: true,
        message: "Withdraw rejected and refunded successfully",
      };
    });
  },
};