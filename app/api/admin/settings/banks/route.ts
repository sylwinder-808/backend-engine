import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const banks =
      await prisma.paymentTarget.findMany({
        where: {
          tenantId: payload.tenantId!,
        },
        orderBy: {
          id: "desc",
        },
      });

    return Response.json({
      success: true,
      banks,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const body = await req.json();

    const bank = await prisma.paymentTarget.create({
      data: {
        tenantId: payload.tenantId!,

        bankName: body.bankName,
        accountName: body.accountName,
        accountNumber: body.accountNumber,

        isActive: body.isActive ?? true,
      },
    });

    return Response.json({
      success: true,
      bank,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Create bank failed",
    });
  }
}