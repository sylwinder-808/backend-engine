import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/admin";
import { LedgerService } from "@/lib/service/ledger.service";

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

    if (!body.username || !body.amount) {
      return Response.json({
        success: false,
        error: "username and amount required",
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. find user
      const user = await tx.user.findUnique({
        where: { username: body.username },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // 2. hitung balance dari ledger
      const beforeBalance = await LedgerService.getBalance(user.id);
      const afterBalance = beforeBalance + body.amount;

      // 3. ledger entry (CREDIT)
      await tx.ledger.create({
        data: {
          userId: user.id,
          type: "admin_inject",
          amount: body.amount,
          direction: "credit",
          before: beforeBalance,
          after: afterBalance,
        },
      });

      // 4. transaction log (history UI)
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "admin_inject",
          amount: body.amount,
          beforeBalance,
          afterBalance,
          status: "success",
          description: "Admin inject coin",
        },
      });

      // 5. admin log (audit trail)
      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "manual_inject",
          targetId: user.id,
          meta: {
            amount: body.amount,
          },
        },
      });

      return {
        username: user.username,
        beforeBalance,
        afterBalance,
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