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

    const amount = Number(body.amount);

    if (!amount || amount <= 0) {
      return Response.json({
        success: false,
        error: "Invalid amount",
      });
    }

    if (!body.method) {
      return Response.json({
        success: false,
        error: "Method required",
      });
    }

    let targetBank = null;

    if (body.targetBankId) {
      targetBank = await prisma.paymentTarget.findFirst({
        where: {
          id: Number(body.targetBankId),
          tenantId: payload.tenantId!,
          isActive: true,
        },
      });

      if (!targetBank) {
        return Response.json({
          success: false,
          error: "Bank target not found",
        });
      }
    }

    const deposit = await prisma.deposit.create({
      data: {
        tenantId: payload.tenantId!,
        userId: payload.id,

        amount,

        method: body.method,

        originAccount:
          body.originAccount ?? null,

        targetBankId:
          body.targetBankId
            ? Number(body.targetBankId)
            : null,

        serialNumber:
          body.serialNumber ?? null,

        proofUrl:
          body.proof ?? null,

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