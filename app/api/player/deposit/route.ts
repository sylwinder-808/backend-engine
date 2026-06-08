import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (payload.role !== "PLAYER") {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    const body = await req.json();

    const deposit = await prisma.deposit.create({
      data: {
        tenantId: payload.tenantId!,
        userId: payload.id,
        amount: Number(body.amount),
        status: "PENDING",
      },
    });

    return Response.json({
      success: true,
      deposit,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Deposit failed",
    });
  }
}