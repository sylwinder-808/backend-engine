import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (
      payload.role !== "CLIENT_ADMIN" &&
      payload.role !== "STAFF"
    ) {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    const players = await prisma.user.findMany({
      where: {
        tenantId: payload.tenantId!,
        role: "PLAYER",
      },
      include: {
        wallet: true,

        bankAccount: {
      take: 1,
      select: {
        bankName: true,
        accountName: true,
        accountNumber: true,
      },
    },
  },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      success: true,
      total: players.length,
      players,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Get players failed",
    });
  }
}