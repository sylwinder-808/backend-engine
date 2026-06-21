import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (payload.role !== "SUPER_ADMIN") {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return Response.json({
        success: false,
        error: "User not found",
      });
    }

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Unauthorized",
    });
  }
}