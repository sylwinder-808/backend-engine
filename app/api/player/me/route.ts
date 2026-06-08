import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

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

    if (!player) {
      return Response.json({
        success: false,
        error: "Player not found",
      });
    }

    return Response.json({
      success: true,
      player,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}