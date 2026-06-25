import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const rawHost =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host");

    console.log("=================================");
    console.log("RAW HOST:", rawHost);

    if (!rawHost) {
      return Response.json({
        success: false,
        error: "Host not found",
      });
    }

    const cleanHost = rawHost
      .replace(/^https?:\/\//, "")
      .split(":")[0]
      .trim()
      .toLowerCase();

    console.log("CLEAN HOST:", cleanHost);

    const domain = await prisma.domain.findFirst({
      where: {
        host: cleanHost,
      },
    });

    console.log("DOMAIN FOUND:", domain);

    if (!domain) {
      const allDomains = await prisma.domain.findMany({
        select: {
          host: true,
        },
      });

      console.log("AVAILABLE DOMAINS:", allDomains);

      return Response.json({
        success: false,
        error: "Tenant not found",
        host: cleanHost,
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
        siteName: siteSetting?.siteName ?? "",
        logoUrl: siteSetting?.logoUrl ?? "",
        faviconUrl: siteSetting?.faviconUrl ?? "",
        maintenanceMode:
          siteSetting?.maintenanceMode ?? false,
        contact: contactSetting,
        template: templateSetting,
      },
    });
  } catch (error) {
    console.error("PUBLIC SITE ERROR:", error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}