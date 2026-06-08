import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);

    const { id } = await params;

    const player = await prisma.user.findFirst({
      where: {
        id: Number(id),
        tenantId: payload.tenantId!,
        role: "PLAYER",
      },
      include: {
        wallet: true,
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
      balance: player.wallet?.balance ?? 0,
      holdBalance: player.wallet?.holdBalance ?? 0,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Get balance failed",
    });
  }
}