import { prisma } from "@/lib/prisma";

function normalizeHost(value: string) {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function removePort(host: string) {
  return host.split(":")[0];
}

export async function GET(req: Request) {
  try {
    const rawHost =
      req.headers.get("x-tenant-host") ||
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host");

    console.log("=================================");
    console.log("X-TENANT-HOST:", req.headers.get("x-tenant-host"));
    console.log("X-FORWARDED-HOST:", req.headers.get("x-forwarded-host"));
    console.log("HOST:", req.headers.get("host"));
    console.log("RAW HOST:", rawHost);

    if (!rawHost) {
      return Response.json({
        success: false,
        error: "Host not found",
      });
    }

    const cleanHost = normalizeHost(rawHost);
    const hostWithoutPort = removePort(cleanHost);

    console.log("CLEAN HOST:", cleanHost);
    console.log("HOST WITHOUT PORT:", hostWithoutPort);

    const domain = await prisma.domain.findFirst({
      where: {
        OR: [
          {
            host: cleanHost,
          },
          {
            host: hostWithoutPort,
          },
        ],
        status: "ACTIVE",
      },
      include: {
        tenant: true,
      },
    });

    console.log("DOMAIN FOUND:", domain);

    if (!domain || !domain.tenant) {
      const allDomains = await prisma.domain.findMany({
        select: {
          host: true,
          status: true,
          tenantId: true,
        },
      });

      console.log("AVAILABLE DOMAINS:", allDomains);

      return Response.json({
        success: false,
        error: "Tenant not found",
        host: cleanHost,
        hostWithoutPort,
      });
    }

    if (domain.tenant.status !== "ACTIVE") {
      return Response.json({
        success: false,
        error: "Tenant inactive",
        host: cleanHost,
      });
    }

    const tenantId = domain.tenantId;

    const [siteSetting, contactSetting, templateSetting] = await Promise.all([
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
        tenant: {
          id: domain.tenant.id,
          name: domain.tenant.name,
          code: domain.tenant.code,
          status: domain.tenant.status,
        },
        siteName: siteSetting?.siteName || domain.tenant.name || "",
        logoUrl: siteSetting?.logoUrl ?? "",
        faviconUrl: siteSetting?.faviconUrl ?? "",
        maintenanceMode: siteSetting?.maintenanceMode ?? false,
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