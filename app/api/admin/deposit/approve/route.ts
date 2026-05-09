import { prisma } from "@/lib/prisma";
import { LedgerService } from "@/lib/service/ledger.service";

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

  const beforeBalance = await LedgerService.getBalance(deposit.userId);
  const afterBalance = beforeBalance + deposit.amount;

  await prisma.$transaction(async (tx) => {
    // 1. update deposit status
    await tx.deposit.update({
      where: { id: deposit.id },
      data: { status: "approved" },
    });

    // 2. create ledger entry (SOURCE OF TRUTH)
    await tx.ledger.create({
      data: {
        userId: deposit.userId,
        type: "deposit",
        amount: deposit.amount,
        direction: "credit",
        before: beforeBalance,
        after: afterBalance,
        refId: deposit.id,
      },
    });

    // 3. transaction log (history UI)
    await tx.transaction.create({
      data: {
        userId: deposit.userId,
        type: "deposit",
        amount: deposit.amount,
        beforeBalance,
        afterBalance,
        status: "success",
        description: "Deposit approved",
      },
    });
  });

  return Response.json({
    success: true,
    message: "Deposit approved",
  });
}