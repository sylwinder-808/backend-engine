import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const totalPlayers = await prisma.user.count({
      where: {
        tenantId: payload.tenantId!,
        role: "PLAYER",
      },
    });

    const totalDeposit = await prisma.deposit.aggregate({
      where: {
        tenantId: payload.tenantId!,
        status: "APPROVED",
      },
      _sum: {
        amount: true,
      },
    });

    const totalWithdraw = await prisma.withdrawal.aggregate({
      where: {
        tenantId: payload.tenantId!,
        status: "APPROVED",
      },
      _sum: {
        amount: true,
      },
    });

    return Response.json({
      success: true,
      totalPlayers,
      totalDeposit:
        totalDeposit._sum.amount ?? 0,
      totalWithdraw:
        totalWithdraw._sum.amount ?? 0,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Dashboard failed",
    });
  }
}