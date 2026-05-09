import { prisma } from "@/lib/prisma";
import { LedgerService } from "@/lib/service/ledger.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { withdrawalId } = body;

    if (!withdrawalId) {
      return Response.json(
        { success: false, error: "withdrawalId required" },
        { status: 400 }
      );
    }

    const withdraw = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdraw || withdraw.status !== "pending") {
      return Response.json(
        { success: false, error: "Invalid withdrawal" },
        { status: 400 }
      );
    }

    const beforeBalance = await LedgerService.getBalance(withdraw.userId);

    if (beforeBalance < withdraw.amount) {
      return Response.json(
        { success: false, error: "Insufficient balance" },
        { status: 400 }
      );
    }

    const afterBalance = beforeBalance - withdraw.amount;

    await prisma.$transaction(async (tx) => {
      // 1. update withdrawal status
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: "approved" },
      });

      // 2. ledger entry (DEBIT)
      await tx.ledger.create({
        data: {
          userId: withdraw.userId,
          type: "withdraw",
          amount: withdraw.amount,
          direction: "debit",
          before: beforeBalance,
          after: afterBalance,
          refId: withdraw.id,
        },
      });

      // 3. transaction log (history UI)
      await tx.transaction.create({
        data: {
          userId: withdraw.userId,
          type: "withdraw_approved",
          amount: withdraw.amount,
          beforeBalance,
          afterBalance,
          status: "success",
          description: "Withdraw approved by admin",
        },
      });
    });

    return Response.json({
      success: true,
      message: "Withdraw approved",
    });
  } catch (err: any) {
    return Response.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}