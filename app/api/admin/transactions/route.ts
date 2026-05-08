import { prisma } from "@/lib/prisma";

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const data = transactions.map((trx) => ({
    id: trx.id,
    username: trx.user.username,
    type: trx.type,
    amount: trx.amount,
    status: trx.status,
    createdAt: trx.createdAt,
  }));

  return Response.json({
    success: true,
    data,
  });
}