import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host");

    if (!host) {
      return Response.json({
        success: false,
        error: "Host not found",
      });
    }

    const cleanHost = host.split(":")[0];

    const domain = await prisma.domain.findUnique({
      where: {
        host: cleanHost,
      },
    });

    if (!domain) {
      return Response.json({
        success: false,
        error: "Tenant not found",
      });
    }

    const banks =
      await prisma.paymentTarget.findMany({
        where: {
          tenantId: domain.tenantId,
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
      });

    return Response.json({
      success: true,
      banks,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}