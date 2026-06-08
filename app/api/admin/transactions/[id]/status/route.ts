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

    const deposit = await prisma.deposit.findFirst({
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

    if (!deposit) {
      return Response.json({
        success: false,
        error: "Deposit not found",
      });
    }

    if (deposit.status !== "PENDING") {
      return Response.json({
        success: false,
        error: "Already processed",
      });
    }

    await prisma.deposit.update({
      where: {
        id: deposit.id,
      },
      data: {
        status: body.status,
      },
    });

    if (body.status === "APPROVED") {
      const before = deposit.user.wallet?.balance ?? 0;
      const after = before + deposit.amount;

      await prisma.wallet.update({
        where: {
          userId: deposit.user.id,
        },
        data: {
          balance: after,
        },
      });

      await prisma.transaction.create({
        data: {
          tenantId: payload.tenantId!,
          userId: deposit.user.id,
          type: "DEPOSIT",
          amount: deposit.amount,
          beforeBalance: before,
          afterBalance: after,
          description: "Deposit Approved",
          status: "APPROVED",
        },
      });

      await prisma.ledger.create({
        data: {
          userId: deposit.user.id,
          type: "DEPOSIT",
          amount: deposit.amount,
          direction: "CREDIT",
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
      error: "Update deposit failed",
    });
  }
}