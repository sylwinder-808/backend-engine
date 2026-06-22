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

    const admin = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isBlocked: true,
        createdAt: true,

        tenant: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });

    if (!admin) {
      return Response.json({
        success: false,
        error: "Admin not found",
      });
    }

    return Response.json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Unauthorized",
    });
  }
}