import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    const deposit = await prisma.deposit.findFirst({
      where: {
        id: Number(id),
        tenantId: payload.tenantId!,
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

    const wallet = await prisma.wallet.findUnique({
      where: {
        userId: deposit.userId,
      },
    });

    const before = wallet?.balance ?? 0;
    const after = before + deposit.amount;

    await prisma.deposit.update({
      where: {
        id: deposit.id,
      },
      data: {
        status: "APPROVED",
      },
    });

    await prisma.wallet.update({
      where: {
        userId: deposit.userId,
      },
      data: {
        balance: after,
      },
    });

    await prisma.transaction.create({
      data: {
        tenantId: deposit.tenantId,
        userId: deposit.userId,
        type: "DEPOSIT",
        amount: deposit.amount,
        beforeBalance: before,
        afterBalance: after,
        description: "Deposit approved",
        status: "APPROVED",
      },
    });

    await prisma.ledger.create({
      data: {
        userId: deposit.userId,
        type: "DEPOSIT",
        amount: deposit.amount,
        direction: "CREDIT",
        before,
        after,
      },
    });

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