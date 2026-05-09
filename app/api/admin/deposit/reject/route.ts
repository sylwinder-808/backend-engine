import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let body;

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid or empty request body" },
      { status: 400 }
    );
  }

  const { depositId } = body;

  if (!depositId) {
    return Response.json(
      { success: false, error: "depositId is required" },
      { status: 400 }
    );
  }

  const deposit = await prisma.deposit.findUnique({
    where: { id: depositId },
  });

  if (!deposit || deposit.status !== "pending") {
    return Response.json(
      { success: false, error: "Invalid deposit" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // 1. update deposit status
    await tx.deposit.update({
      where: { id: deposit.id },
      data: { status: "rejected" },
    });

    // 2. ambil wallet balance
    const wallet = await tx.wallet.findUnique({
      where: { userId: deposit.userId },
    });

    const beforeBalance = wallet?.balance ?? 0;
    const afterBalance = beforeBalance;

    // 3. transaction log (WAJIB lengkap schema Prisma)
    await tx.transaction.create({
      data: {
        userId: deposit.userId,
        type: "deposit_rejected",
        amount: deposit.amount,
        status: "failed",
        description: "Deposit rejected by admin",

        beforeBalance,
        afterBalance,
      },
    });

    // 4. admin log (CAST JSON aman)
    await tx.adminLog.create({
      data: {
        adminId: 1,
        action: "deposit_reject",
        targetId: deposit.id,
        meta: {
          amount: deposit.amount,
        } as any, // 👈 FIX PRISMA JSON TYPE ISSUE
      },
    });
  });

  return Response.json({
    success: true,
    message: "Deposit rejected",
  });
}