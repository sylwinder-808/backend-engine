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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    if (!payload?.tenantId) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const body = await req.json();

    const existing = await prisma.banner.findFirst({
      where: {
        id,
        tenantId: payload.tenantId,
      },
    });

    if (!existing) {
      return Response.json({
        success: false,
        error: "Banner not found",
      });
    }

    const title = cleanString(body.title) || existing.title;
    const subtitle =
      body.subtitle !== undefined ? cleanOptional(body.subtitle) : existing.subtitle;
    const imageUrl =
      body.imageUrl !== undefined ? cleanOptional(body.imageUrl) : existing.imageUrl;
    const href = body.href !== undefined ? cleanOptional(body.href) : existing.href;
    const placement = cleanString(body.placement) || existing.placement;
    const isActive =
      body.isActive !== undefined
        ? toBoolean(body.isActive, existing.isActive)
        : existing.isActive;
    const sortOrder =
      body.sortOrder !== undefined ? toNumber(body.sortOrder) : existing.sortOrder;

    const banner = await prisma.banner.update({
      where: {
        id: existing.id,
      },
      data: {
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
    console.error("UPDATE_ADMIN_BANNER_ERROR:", error);

    return Response.json({
      success: false,
      error: getErrorMessage(error),
    });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    if (!payload?.tenantId) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const existing = await prisma.banner.findFirst({
      where: {
        id,
        tenantId: payload.tenantId,
      },
    });

    if (!existing) {
      return Response.json({
        success: false,
        error: "Banner not found",
      });
    }

    await prisma.banner.delete({
      where: {
        id: existing.id,
      },
    });

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE_ADMIN_BANNER_ERROR:", error);

    return Response.json({
      success: false,
      error: getErrorMessage(error),
    });
  }
}