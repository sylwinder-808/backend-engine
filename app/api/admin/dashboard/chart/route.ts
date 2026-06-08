import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const tenantId = payload.tenantId!;

    const transactions =
      await prisma.transaction.findMany({
        where: {
          tenantId,
          status: "APPROVED",
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    const chart = transactions.map((trx) => ({
      date: trx.createdAt.toISOString().split("T")[0],
      type: trx.type,
      amount: trx.amount,
    }));

    return Response.json({
      success: true,
      chart,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}