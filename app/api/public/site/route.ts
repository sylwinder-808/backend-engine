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

    const tenantId = domain.tenantId;

    const [
      siteSetting,
      contactSetting,
      templateSetting,
    ] = await Promise.all([
      prisma.siteSetting.findUnique({
        where: {
          tenantId,
        },
      }),

      prisma.contactSetting.findUnique({
        where: {
          tenantId,
        },
      }),

      prisma.templateSetting.findUnique({
        where: {
          tenantId,
        },
      }),
    ]);

    return Response.json({
      success: true,

      site: {
        siteName:
          siteSetting?.siteName ?? "",

        logoUrl:
          siteSetting?.logoUrl ?? "",

        faviconUrl:
          siteSetting?.faviconUrl ?? "",

        maintenanceMode:
          siteSetting?.maintenanceMode ??
          false,

        contact: contactSetting,

        template: templateSetting,
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}