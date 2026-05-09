import { prisma } from "@/lib/prisma";
import { LedgerService } from "@/lib/services/ledger.service";

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
    const afterBalance = beforeBalance + withdraw.amount;

    await prisma.$transaction(async (tx) => {
      // 1. update status withdraw
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: "rejected" },
      });

      // 2. ledger refund (CREDIT)
      await tx.ledger.create({
        data: {
          userId: withdraw.userId,
          type: "withdraw_refund",
          amount: withdraw.amount,
          direction: "credit",
          before: beforeBalance,
          after: afterBalance,
          refId: withdraw.id,
        },
      });

      // 3. transaction log (UI history)
      await tx.transaction.create({
        data: {
          userId: withdraw.userId,
          type: "withdraw_rejected_refund",
          amount: withdraw.amount,
          status: "success",
          beforeBalance,
          afterBalance,
          description: "Withdraw rejected + refund",
        },
      });

      // 4. admin log (audit trail)
      await tx.adminLog.create({
        data: {
          adminId: 1, // nanti ambil dari JWT
          action: "withdraw_reject",
          targetId: withdraw.id,
          meta: {
            amount: withdraw.amount,
            type: "refund",
          },
        },
      });
    });

    return Response.json({
      success: true,
      message: "Withdraw rejected and refunded successfully",
    });
  } catch (err: any) {
    return Response.json(
      {
        success: false,
        error: err.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}