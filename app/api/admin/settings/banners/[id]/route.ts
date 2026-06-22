import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

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

    const banner = await prisma.banner.findFirst({
      where: {
        id,
        tenantId: payload.tenantId!,
      },
    });

    if (!banner) {
      return Response.json({
        success: false,
        error: "Banner not found",
      });
    }

    const updatedBanner =
      await prisma.banner.update({
        where: {
          id,
        },
        data: {
          title: body.title ?? banner.title,

          subtitle:
            body.subtitle ?? banner.subtitle,

          placement:
            body.placement ?? banner.placement,

          href:
            body.href ?? banner.href,

          sortOrder:
            body.sortOrder ?? banner.sortOrder,

          isActive:
            body.isActive ?? banner.isActive,

          imageUrl:
            body.imageUrl ?? banner.imageUrl,
        },
      });

    return Response.json({
      success: true,
      banner: updatedBanner,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Update banner failed",
    });
  }
}