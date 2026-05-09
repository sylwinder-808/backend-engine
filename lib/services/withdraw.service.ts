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

      const beforeBalance = withdraw.user.wallet.balance;
      const refundAmount = withdraw.amount;
      const afterBalance = beforeBalance + refundAmount;

      // 2. update withdraw status
      await tx.withdrawal.update({
        where: { id },
        data: { status: "rejected" },
      });

      // 3. refund wallet
      await tx.wallet.update({
        where: { userId: withdraw.userId },
        data: {
          balance: {
            increment: refundAmount,
          },
        },
      });

      // 4. transaction log
      await tx.transaction.create({
        data: {
          userId: withdraw.userId,
          type: "withdraw_rejected_refund",
          amount: refundAmount,
          beforeBalance,
          afterBalance,
          status: "success",
          description: reason || "Withdraw rejected and refunded",
        },
      });

      // 5. admin log (audit trail)
      await tx.adminLog.create({
        data: {
          adminId,
          action: "withdraw_reject",
          targetId: withdraw.id,
          meta: {
            amount: refundAmount,
            reason,
          },
        },
      });

      return {
        success: true,
        message: "Withdraw rejected and refunded successfully",
      };
    });
  },
};