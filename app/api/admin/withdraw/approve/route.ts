import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await prisma.$transaction(async (tx) => {

    const wd = await tx.withdrawal.findUnique({
      where: { id: body.withdrawId }
    });

    if (!wd || wd.status !== "pending") {
      throw new Error("Invalid withdrawal");
    }

    const wallet = await tx.wallet.findUnique({
      where: { userId: wd.userId }
    });

    // dari HOLD → FINAL
    const newHold = wallet.holdBalance - wd.amount;

    await tx.wallet.update({
      where: { userId: wd.userId },
      data: {
        holdBalance: newHold
      }
    });

    const updated = await tx.withdrawal.update({
      where: { id: wd.id },
      data: { status: "approved" }
    });

    return updated;
  });

  return Response.json({ success: true, data: result });
}