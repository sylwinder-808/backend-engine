import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    const admin = verifyAdmin(req);

    if (!admin) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const body = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      // cari user
      const user = await tx.user.findUnique({
        where: {
          username: body.username,
        },
        include: {
          wallet: true,
        },
      });

      if (!user || !user.wallet) {
        throw new Error("User not found");
      }

      const before = user.wallet.balance;
      const after = before + body.amount;

      // update wallet
      await tx.wallet.update({
        where: {
          userId: user.id,
        },
        data: {
          balance: after,
        },
      });

      // create transaction log
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "deposit",
          amount: body.amount,
          beforeBalance: before,
          afterBalance: after,
          description: "Admin inject coin",
        },
      });

      return {
        username: user.username,
        before,
        after,
      };
    });

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.log(error);

    return Response.json({
      success: false,
      error: error.message || "Inject failed",
    });
  }
}