import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const contact =
      await prisma.contactSetting.findUnique({
        where: {
          tenantId: payload.tenantId!,
        },
      });

    return Response.json({
      success: true,
      contact,
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

    const contact =
      await prisma.contactSetting.upsert({
        where: {
          tenantId: payload.tenantId!,
        },
        update: {
          whatsapp:
            body.whatsapp,

          telegram:
            body.telegram,

          email:
            body.email,

          livechatUrl:
            body.livechatUrl,
        },
        create: {
          tenantId:
            payload.tenantId!,

          whatsapp:
            body.whatsapp,

          telegram:
            body.telegram,

          email:
            body.email,

          livechatUrl:
            body.livechatUrl,
        },
      });

    return Response.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Update failed",
    });
  }
}