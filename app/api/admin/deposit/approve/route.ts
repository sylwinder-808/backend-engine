import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let body;

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid body" },
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
    include: { user: true },
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
      data: { status: "approved" },
    });

    // 2. update wallet balance
    await tx.wallet.update({
      where: { userId: deposit.userId },
      data: {
        balance: {
          increment: deposit.amount,
        },
      },
    });

    // 3. create transaction log
    await tx.transaction.create({
      data: {
        userId: deposit.userId,
        type: "deposit",
        amount: deposit.amount,
        beforeBalance: 0, // bisa kamu improve nanti
        afterBalance: 0,  // bisa dihitung real
        description: "Deposit approved",
      },
    });
  });

  return Response.json({
    success: true,
    message: "Deposit approved",
  });
}