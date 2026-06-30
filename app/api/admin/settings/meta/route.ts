import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const metaSettingSchema = z.object({
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),

  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),

  twitterTitle: z.string().optional().nullable(),
  twitterDescription: z.string().optional().nullable(),
  twitterImage: z.string().optional().nullable(),

  canonicalUrl: z.string().optional().nullable(),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional(),
});

function cleanOptional(value: unknown) {
  if (typeof value !== "string") return null;

  const text = value.trim();

  return text.length > 0 ? text : null;
}

function getBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;

  return fallback;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

function getTenantIdFromRequest(req: Request) {
  const payload = getUserFromRequest(req);

  if (!payload?.tenantId) return null;

  return String(payload.tenantId);
}

export async function GET(req: Request) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    if (!tenantId) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Akses ditolak.",
        },
        { status: 401 }
      );
    }

    const seo = await prisma.seoSetting.findUnique({
      where: {
        tenantId,
      },
    });

    return Response.json({
      success: true,
      seo: {
        metaTitle: seo?.metaTitle ?? null,
        metaDescription: seo?.metaDescription ?? null,
        metaKeywords: seo?.metaKeywords ?? null,

        ogTitle: seo?.ogTitle ?? null,
        ogDescription: seo?.ogDescription ?? null,
        ogImage: seo?.ogImage ?? null,

        twitterTitle: seo?.twitterTitle ?? null,
        twitterDescription: seo?.twitterDescription ?? null,
        twitterImage: seo?.twitterImage ?? null,

        canonicalUrl: seo?.canonicalUrl ?? null,
        robotsIndex: seo?.robotsIndex ?? true,
        robotsFollow: seo?.robotsFollow ?? true,
      },
    });
  } catch (error) {
    console.error("GET_ADMIN_META_SETTING_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal mengambil meta SEO.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    if (!tenantId) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Akses ditolak.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = metaSettingSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: "Invalid meta data",
          message: "Data meta SEO tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const seo = await prisma.seoSetting.upsert({
      where: {
        tenantId,
      },
      create: {
        tenantId,

        metaTitle: cleanOptional(data.metaTitle),
        metaDescription: cleanOptional(data.metaDescription),
        metaKeywords: cleanOptional(data.metaKeywords),

        ogTitle: cleanOptional(data.ogTitle),
        ogDescription: cleanOptional(data.ogDescription),
        ogImage: cleanOptional(data.ogImage),

        twitterTitle: cleanOptional(data.twitterTitle),
        twitterDescription: cleanOptional(data.twitterDescription),
        twitterImage: cleanOptional(data.twitterImage),

        canonicalUrl: cleanOptional(data.canonicalUrl),
        robotsIndex: getBoolean(data.robotsIndex, true),
        robotsFollow: getBoolean(data.robotsFollow, true),
      },
      update: {
        metaTitle: cleanOptional(data.metaTitle),
        metaDescription: cleanOptional(data.metaDescription),
        metaKeywords: cleanOptional(data.metaKeywords),

        ogTitle: cleanOptional(data.ogTitle),
        ogDescription: cleanOptional(data.ogDescription),
        ogImage: cleanOptional(data.ogImage),

        twitterTitle: cleanOptional(data.twitterTitle),
        twitterDescription: cleanOptional(data.twitterDescription),
        twitterImage: cleanOptional(data.twitterImage),

        canonicalUrl: cleanOptional(data.canonicalUrl),
        robotsIndex: getBoolean(data.robotsIndex, true),
        robotsFollow: getBoolean(data.robotsFollow, true),
      },
    });

    return Response.json({
      success: true,
      message: "Meta SEO berhasil disimpan.",
      seo,
    });
  } catch (error) {
    console.error("UPDATE_ADMIN_META_SETTING_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal menyimpan meta SEO.",
      },
      { status: 500 }
    );
  }
}