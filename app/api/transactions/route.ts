import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const userId = Number(req.url.split("userId=")[1]);

  const data = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return Response.json({ success: true, data });
}