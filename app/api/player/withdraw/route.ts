import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const body = await req.json();

    const wallet = await prisma.wallet.findUnique({
      where: {
        userId: payload.id,
      },
    });

    const amount = Number(body.amount);

    if (!wallet || wallet.balance < amount) {
      return Response.json({
        success: false,
        error: "Insufficient balance",
      });
    }

    const bank = await prisma.bankAccount.findFirst({
      where: {
        userId: payload.id,
      },
    });

    if (!bank) {
      return Response.json({
        success: false,
        error: "Bank account not found",
      });
    }

    const withdraw = await prisma.withdrawal.create({
      data: {
        tenantId: payload.tenantId!,
        userId: payload.id,
        amount,
        accountName: bank.accountName,
        accountNumber: bank.accountNumber,
        bankName: bank.bankName,
        beforeBalance: wallet.balance,
        afterBalance: wallet.balance - amount,
        status: "PENDING",
      },
    });

    return Response.json({
      success: true,
      withdraw,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Withdraw failed",
    });
  }
}