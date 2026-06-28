import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

function cleanOptional(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function cleanString(value: unknown) {
  if (typeof value !== "string") return "";

  return value.trim();
}

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";

  return fallback;
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload?.tenantId) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const banners = await prisma.banner.findMany({
      where: {
        tenantId: payload.tenantId,
      },
      orderBy: [
        {
          placement: "asc",
        },
        {
          sortOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return Response.json({
      success: true,
      banners,
      data: banners,
    });
  } catch (error) {
    console.error("GET_ADMIN_BANNERS_ERROR:", error);

    return Response.json({
      success: false,
      error: getErrorMessage(error),
    });
  }
}

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload?.tenantId) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const body = await req.json();

    const title = cleanString(body.title);
    const subtitle = cleanOptional(body.subtitle);
    const imageUrl = cleanOptional(body.imageUrl);
    const href = cleanOptional(body.href);
    const placement = cleanString(body.placement) || "HOME";
    const isActive = toBoolean(body.isActive, true);
    const sortOrder = toNumber(body.sortOrder);

    if (!title) {
      return Response.json({
        success: false,
        error: "Title wajib diisi.",
      });
    }

    const banner = await prisma.banner.create({
      data: {
        tenantId: payload.tenantId,
        title,
        subtitle,
        imageUrl,
        href,
        placement,
        isActive,
        sortOrder,
      },
    });

    return Response.json({
      success: true,
      banner,
      data: banner,
    });
  } catch (error) {
    console.error("CREATE_ADMIN_BANNER_ERROR:", error);

    return Response.json({
      success: false,
      error: getErrorMessage(error),
    });
  }
}