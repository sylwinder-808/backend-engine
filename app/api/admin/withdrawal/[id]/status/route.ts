import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);

    const { id } = await params;
    const body = await req.json();

    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        id: Number(id),
        tenantId: payload.tenantId!,
      },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
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
        error: "Already processed",
      });
    }

    await prisma.withdrawal.update({
      where: {
        id: withdrawal.id,
      },
      data: {
        status: body.status,
      },
    });

    if (body.status === "APPROVED") {
      const before = withdrawal.user.wallet?.balance ?? 0;

      if (before < withdrawal.amount) {
        return Response.json({
          success: false,
          error: "Insufficient balance",
        });
      }

      const after = before - withdrawal.amount;

      await prisma.wallet.update({
        where: {
          userId: withdrawal.user.id,
        },
        data: {
          balance: after,
        },
      });

      await prisma.transaction.create({
        data: {
          tenantId: payload.tenantId!,
          userId: withdrawal.user.id,
          type: "WITHDRAW",
          amount: withdrawal.amount,
          beforeBalance: before,
          afterBalance: after,
          description: "Withdraw Approved",
          status: "APPROVED",
        },
      });

      await prisma.ledger.create({
        data: {
          userId: withdrawal.user.id,
          type: "WITHDRAW",
          amount: withdrawal.amount,
          direction: "DEBIT",
          before,
          after,
        },
      });
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Update withdrawal failed",
    });
  }
}