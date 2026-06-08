import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: payload.tenantId!,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return Response.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}