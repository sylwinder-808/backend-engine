import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    const deposit =
      await prisma.deposit.findFirst({
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

    await prisma.$transaction([
      prisma.deposit.update({
        where: {
          id: deposit.id,
        },
        data: {
          status: "REJECTED",
        },
      }),

      prisma.transaction.create({
        data: {
          tenantId: deposit.tenantId,
          userId: deposit.userId,

          type: "DEPOSIT",
          amount: deposit.amount,

          beforeBalance: 0,
          afterBalance: 0,

          description:
            "Deposit Rejected",

          status: "REJECTED",
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
      error: "Reject failed",
    });
  }
}