import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const template =
      await prisma.templateSetting.findUnique({
        where: {
          tenantId: payload.tenantId!,
        },
      });

    return Response.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}

export async function PATCH(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const body = await req.json();

    const template =
      await prisma.templateSetting.upsert({
        where: {
          tenantId: payload.tenantId!,
        },
        update: {
          primaryColor:
            body.primaryColor,

          secondaryColor:
            body.secondaryColor,

          loginBackground:
            body.loginBackground,

          registerBackground:
            body.registerBackground,
        },
        create: {
          tenantId:
            payload.tenantId!,

          primaryColor:
            body.primaryColor,

          secondaryColor:
            body.secondaryColor,

          loginBackground:
            body.loginBackground,

          registerBackground:
            body.registerBackground,
        },
      });

    return Response.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Update failed",
    });
  }
}