import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    const withdrawal =
      await prisma.withdrawal.findFirst({
        where: {
          id: Number(id),
          tenantId: payload.tenantId!,
        },
      });

    if (!withdrawal) {
      return Response.json({
        success: false,
        error: "Withdrawal not found",
      });
    }

    if (withdrawal.status !== "PENDING") {
      return Response.json({
        success: false,
        error: "Withdrawal already processed",
      });
    }

    const wallet = await prisma.wallet.findUnique({
      where: {
        userId: withdrawal.userId,
      },
    });

    if (!wallet) {
      return Response.json({
        success: false,
        error: "Wallet not found",
      });
    }

    const beforeBalance = wallet.balance;
    const afterBalance =
      beforeBalance - withdrawal.amount;

    if (afterBalance < 0) {
      return Response.json({
        success: false,
        error: "Insufficient balance",
      });
    }

    await prisma.$transaction([
      prisma.wallet.update({
        where: {
          userId: withdrawal.userId,
        },
        data: {
          balance: afterBalance,
        },
      }),

      prisma.withdrawal.update({
        where: {
          id: withdrawal.id,
        },
        data: {
          status: "APPROVED",
          beforeBalance,
          afterBalance,
        },
      }),

      prisma.transaction.create({
        data: {
          tenantId: withdrawal.tenantId,
          userId: withdrawal.userId,

          type: "WITHDRAW",
          amount: withdrawal.amount,

          beforeBalance,
          afterBalance,

          description: "Withdrawal Approved",

          status: "APPROVED",
        },
      }),

      prisma.ledger.create({
        data: {
          userId: withdrawal.userId,

          type: "WITHDRAW",
          amount: withdrawal.amount,

          direction: "OUT",

          before: beforeBalance,
          after: afterBalance,
        },
      }),
    ]);

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Approve failed",
    });
  }
}