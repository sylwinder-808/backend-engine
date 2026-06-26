import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const deposits = await prisma.deposit.findMany({
      where: {
        tenantId: payload.tenantId!,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const adjustments = await prisma.transaction.findMany({
      where: {
        tenantId: payload.tenantId!,
      },
      include: {
        user: true,
     },
   });

    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        tenantId: payload.tenantId!,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      success: true,
      deposits,
      adjustments,
      withdrawals,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Get transactions failed",
    });
  }
}