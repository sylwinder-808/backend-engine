import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await prisma.$transaction(async (tx) => {

    const wallet = await tx.wallet.findUnique({
      where: { userId: body.userId }
    });

    if (!wallet || wallet.balance < body.amount) {
      throw new Error("Insufficient balance");
    }

    const newBalance = wallet.balance - body.amount;
    const newHold = wallet.holdBalance + body.amount;

    await tx.wallet.update({
      where: { userId: body.userId },
      data: {
        balance: newBalance,
        holdBalance: newHold
      }
    });

    const wd = await tx.withdrawal.create({
      data: {
        userId: body.userId,
        amount: body.amount,
        status: "pending"
      }
    });

    return wd;
  });

  return Response.json({ success: true, data: result });
}