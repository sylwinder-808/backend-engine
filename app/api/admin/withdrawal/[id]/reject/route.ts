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
        error: "Already processed",
      });
    }

    await prisma.$transaction([
      prisma.withdrawal.update({
        where: {
          id: withdrawal.id,
        },
        data: {
          status: "REJECTED",
        },
      }),

      prisma.transaction.create({
        data: {
          tenantId: withdrawal.tenantId,
          userId: withdrawal.userId,

          type: "WITHDRAW",
          amount: withdrawal.amount,

          beforeBalance:
            withdrawal.beforeBalance,

          afterBalance:
            withdrawal.beforeBalance,

          description:
            "Withdrawal Rejected",

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