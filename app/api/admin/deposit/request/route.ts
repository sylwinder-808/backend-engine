import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const deposit = await prisma.deposit.create({
    data: {
      userId: body.userId,
      amount: body.amount,
      status: "pending",
    },
  });

  return Response.json({
    success: true,
    data: deposit,
  });
}