import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      // 1. ambil withdrawal
      const wd = await tx.withdrawal.findUnique({
        where: { id: body.withdrawId },
      });

      if (!wd || wd.status !== "pending") {
        throw new Error("Invalid withdrawal");
      }

      // 2. ambil wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId: wd.userId },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      // 3. CEK SALDO (biar gak minus)
      if (wallet.holdBalance < wd.amount) {
        throw new Error("Insufficient balance");
      }

      // 4. HITUNG SALDO BARU (INI FIX UTAMA ERROR KAMU)
      const newHold = wallet.holdBalance - wd.amount;

      // 5. update wallet
      await tx.wallet.update({
        where: { userId: wd.userId },
        data: {
          holdBalance: newHold,
        },
      });

      // 6. update withdrawal status
      const updated = await tx.withdrawal.update({
        where: { id: wd.id },
        data: {
          status: "approved",
        },
      });

      return updated;
    });

    return Response.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return Response.json(
      {
        success: false,
        message: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}