import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. auth check
    const payload = getUserFromRequest(req);

    if (!payload || payload.role !== "SUPER_ADMIN") {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    // 2. parse body
    const body = await req.json();

    if (!body.tenantId || !body.host) {
      return Response.json({
        success: false,
        error: "tenantId and host are required",
      });
    }

    // 3. check tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: {
        id: body.tenantId,
      },
    });

    if (!tenant) {
      return Response.json({
        success: false,
        error: "Invalid Credentials",
      });
    }

    // 4. check duplicate domain
    const existingDomain = await prisma.domain.findUnique({
      where: {
        host: body.host,
      },
    });

    if (existingDomain) {
      return Response.json({
        success: false,
        error: "Domain already exists",
      });
    }

    // 5. create domain
    const domain = await prisma.domain.create({
      data: {
        tenantId: tenant.id,
        host: body.host,
        isPrimary: body.isPrimary ?? false,
        status: "ACTIVE",
      },
    });

    return Response.json({
      success: true,
      domain,
    });
  } catch (error) {
    console.error("CREATE DOMAIN ERROR:", error);

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}