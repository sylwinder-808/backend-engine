import { prisma } from "@/lib/prisma";

export async function GET() {
  const deposits = await prisma.deposit.findMany({
    where: { status: "pending" },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    success: true,
    data: deposits,
  });
}