import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json();

    const player = await prisma.user.findFirst({
      where: {
        id: Number(id),
        tenantId: payload.tenantId!,
        role: "PLAYER",
      },
    });

    if (!player) {
      return Response.json({
        success: false,
        error: "Player not found",
      });
    }

    const hashedPassword = await bcrypt.hash(
      body.password,
      10
    );

    await prisma.user.update({
      where: {
        id: player.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return Response.json({
      success: true,
      message: "Password updated",
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Change password failed",
    });
  }
}