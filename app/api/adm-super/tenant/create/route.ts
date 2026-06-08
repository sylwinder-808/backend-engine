import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (payload.role !== "SUPER_ADMIN") {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    const body = await req.json();

    const tenant = await prisma.tenant.create({
      data: {
        name: body.name,
        code: body.code.toUpperCase(),
      },
    });

    return Response.json({
      success: true,
      tenant,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Create tenant failed",
    });
  }
}