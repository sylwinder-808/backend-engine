import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const staffs = await prisma.user.findMany({
      where: {
        tenantId: payload.tenantId!,
        role: "STAFF",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      success: true,
      staffs,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}