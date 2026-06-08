import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);

    const { id } = await params;

    const body = await req.json();

    const amount = Number(body.amount);

    if (!amount) {
      return Response.json({
        success: false,
        error: "Amount required",
      });
    }

    const player = await prisma.user.findFirst({
      where: {
        id: Number(id),
        tenantId: payload.tenantId!,
        role: "PLAYER",
      },
      include: {
        wallet: true,
      },
    });

    if (!player || !player.wallet) {
      return Response.json({
        success: false,
        error: "Player not found",
      });
    }

    const before = player.wallet.balance;

    const after = before + amount;

    if (after < 0) {
      return Response.json({
        success: false,
        error: "Insufficient balance",
      });
    }

    await prisma.wallet.update({
      where: {
        userId: player.id,
      },
      data: {
        balance: after,
      },
    });

    await prisma.transaction.create({
      data: {
        tenantId: payload.tenantId!,
        userId: player.id,
        type: "ADJUSTMENT",
        amount,
        beforeBalance: before,
        afterBalance: after,
        description:
          body.note ?? "Admin adjustment",
        status: "APPROVED",
      },
    });

    await prisma.ledger.create({
      data: {
        userId: player.id,
        type: "ADJUSTMENT",
        amount,
        direction:
          amount > 0 ? "CREDIT" : "DEBIT",
        before,
        after,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: payload.tenantId!,
        actorId: payload.id,
        action: "ADJUST_BALANCE",
        entity: "USER",
        entityId: String(player.id),
        metadata: {
          amount,
          before,
          after,
        },
      },
    });

    return Response.json({
      success: true,
      before,
      after,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Adjustment failed",
    });
  }
}