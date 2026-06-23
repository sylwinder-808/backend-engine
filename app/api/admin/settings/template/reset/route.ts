import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const template =
      await prisma.templateSetting.upsert({
        where: {
          tenantId: payload.tenantId!,
        },
        update: {
          primaryColor: "#1677ff",
          secondaryColor: "#001529",

          loginBackground: null,
          registerBackground: null,
        },
        create: {
          tenantId: payload.tenantId!,

          primaryColor: "#1677ff",
          secondaryColor: "#001529",
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
      error: "Reset failed",
    });
  }
}