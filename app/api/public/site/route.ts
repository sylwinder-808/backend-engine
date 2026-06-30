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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

async function resolveTenant(req: Request) {
  const rawHost =
    req.headers.get("x-tenant-host") ||
    req.headers.get("x-public-domain") ||
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host");

  if (!rawHost) {
    return {
      success: false as const,
      error: "Host not found",
      cleanHost: null,
      hostWithoutPort: null,
      domain: null,
    };
  }

  const cleanHost = normalizeHost(rawHost);
  const hostWithoutPort = removePort(cleanHost);

  const domain = await prisma.domain.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ host: cleanHost }, { host: hostWithoutPort }],
    },
    include: {
      tenant: true,
    },
  });

  if (!domain || !domain.tenant) {
    return {
      success: false as const,
      error: "Tenant not found",
      cleanHost,
      hostWithoutPort,
      domain: null,
    };
  }

  if (domain.tenant.status !== "ACTIVE") {
    return {
      success: false as const,
      error: "Tenant inactive",
      cleanHost,
      hostWithoutPort,
      domain,
    };
  }

  return {
    success: true as const,
    error: null,
    cleanHost,
    hostWithoutPort,
    domain,
  };
}

/**
 * SEO builder (pakai SeoSetting)
 */
function buildSeo({
  seoSetting,
  siteName,
  logoUrl,
  canonicalUrl,
}: {
  seoSetting: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string | null;

    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImage?: string | null;

    twitterTitle?: string | null;
    twitterDescription?: string | null;
    twitterImage?: string | null;

    canonicalUrl?: string | null;
    robotsIndex?: boolean | null;
    robotsFollow?: boolean | null;
  } | null;

  siteName: string;
  logoUrl: string | null;
  canonicalUrl: string | null;
}) {
  const metaTitle = seoSetting?.metaTitle || siteName;

  const metaDescription =
    seoSetting?.metaDescription || `${siteName} - Website`;

  const ogTitle = seoSetting?.ogTitle || metaTitle;
  const ogDescription = seoSetting?.ogDescription || metaDescription;
  const ogImage = seoSetting?.ogImage || logoUrl;

  const twitterTitle = seoSetting?.twitterTitle || ogTitle;
  const twitterDescription = seoSetting?.twitterDescription || ogDescription;
  const twitterImage = seoSetting?.twitterImage || ogImage;

  return {
    metaTitle,
    metaDescription,
    metaKeywords: seoSetting?.metaKeywords || null,

    ogTitle,
    ogDescription,
    ogImage,

    twitterTitle,
    twitterDescription,
    twitterImage,

    canonicalUrl: seoSetting?.canonicalUrl || canonicalUrl,

    robotsIndex: seoSetting?.robotsIndex ?? true,
    robotsFollow: seoSetting?.robotsFollow ?? true,
  };
}

export async function GET(req: Request) {
  try {
    const resolved = await resolveTenant(req);

    if (!resolved.success || !resolved.domain || !resolved.domain.tenant) {
      return Response.json(
        {
          success: false,
          error: resolved.error,
          message:
            resolved.error === "Tenant inactive"
              ? "Website sedang tidak aktif."
              : "Public site tidak ditemukan.",
          host: resolved.cleanHost,
          hostWithoutPort: resolved.hostWithoutPort,
        },
        {
          status: resolved.error === "Tenant inactive" ? 403 : 404,
        }
      );
    }

    const tenantId = resolved.domain.tenantId;
    const tenant = resolved.domain.tenant;
    const domain = resolved.domain;

    const [
      siteSetting,
      seoSetting,
      contactSetting,
      templateSetting,
      banners,
    ] = await Promise.all([
      prisma.siteSetting.findUnique({
        where: { tenantId },
      }),

      prisma.seoSetting.findUnique({
        where: { tenantId },
      }),

      prisma.contactSetting.findUnique({
        where: { tenantId },
      }),

      prisma.templateSetting.findUnique({
        where: { tenantId },
      }),

      prisma.banner.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        orderBy: [
          { placement: "asc" },
          { sortOrder: "asc" },
          { createdAt: "desc" },
        ],
      }),
    ]);

    const siteName = siteSetting?.siteName || tenant.name || "NAMA";
    const logoUrl = siteSetting?.logoUrl || null;
    const faviconUrl = siteSetting?.faviconUrl || logoUrl;

    const canonicalUrl = domain.host
      ? `https://${domain.host}`
      : null;

    const seo = buildSeo({
      seoSetting,
      siteName,
      logoUrl,
      canonicalUrl,
    });

    const contact = {
      whatsapp: contactSetting?.whatsapp ?? null,
      telegram: contactSetting?.telegram ?? null,
      email: contactSetting?.email ?? null,
      livechatUrl: contactSetting?.livechatUrl ?? null,

      whatsappUrl: contactSetting?.whatsapp ?? null,
      telegramUrl: contactSetting?.telegram ?? null,
      liveChatUrl: contactSetting?.livechatUrl ?? null,
    };

    const template = templateSetting ? { ...templateSetting } : null;

    const setting = {
      siteName,
      logoUrl,
      faviconUrl,

      maintenanceMode: siteSetting?.maintenanceMode ?? false,

      ...contact,
      contact,
      template,
      seo,

      tenant: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        status: tenant.status,
      },

      domain: {
        id: domain.id,
        host: domain.host,
        status: domain.status,
        isPrimary: domain.isPrimary,
      },
    };

    return Response.json({
      success: true,
      setting,
      banners,

      // backward compatibility
      site: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          status: tenant.status,
        },
        siteName,
        logoUrl,
        faviconUrl,
        maintenanceMode: siteSetting?.maintenanceMode ?? false,
        contact: contactSetting,
        template: templateSetting,
        seo,
      },
    });
  } catch (error) {
    console.error("PUBLIC_SITE_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Public site tidak dapat dihubungi.",
      },
      { status: 500 }
    );
  }
}