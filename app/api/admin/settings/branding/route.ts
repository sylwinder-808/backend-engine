import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(req: Request) {
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

    const body = await req.json();

    const setting =
      await prisma.siteSetting.upsert({
        where: {
          tenantId: payload.tenantId!,
        },

        update: {
          siteName: body.siteName,
          logoUrl: body.logoUrl,
        },

        create: {
          tenantId: payload.tenantId!,
          siteName: body.siteName,
          logoUrl: body.logoUrl,
        },
      });

    return Response.json({
      success: true,
      setting,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Update branding failed",
    });
  }
}