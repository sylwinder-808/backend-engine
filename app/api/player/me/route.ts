import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload?.id) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const player = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      include: {
        wallet: true,
        bankAccount: true,
        tenant: true,
      },
    });

    if (!player || player.role !== "PLAYER") {
      return Response.json({
        success: false,
        error: "Player not found",
      });
    }

    if (player.isBlocked) {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    return Response.json({
      success: true,
      player: {
        id: player.id,
        tenantId: player.tenantId,
        username: player.username,
        email: player.email,
        phone: player.phone,
        role: player.role,
        isBlocked: player.isBlocked,
        createdAt: player.createdAt,
        wallet: player.wallet,
        bankAccount: player.bankAccount,
        tenant: player.tenant,
      },
    });
  } catch (error) {
    console.error("PLAYER ME ERROR:", error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}