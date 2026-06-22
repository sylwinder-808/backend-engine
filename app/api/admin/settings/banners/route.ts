import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
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

    const banner = await prisma.banner.create({
      data: {
        tenantId: payload.tenantId!,

        title: body.title,
        subtitle: body.subtitle,

        placement: body.placement,

        href: body.href,

        imageUrl: body.imageUrl,

        sortOrder: Number(
          body.sortOrder ?? 0
        ),

        isActive:
          body.isActive ?? true,
      },
    });

    return Response.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Create banner failed",
    });
  }
}