import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const admin = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      include: {
        tenant: true,
      },
    });

    return Response.json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}