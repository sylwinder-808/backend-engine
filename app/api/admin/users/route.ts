import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      wallet: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const safeUsers = users.map((u) => {
    const { password, ...safe } = u;
    return safe;
  });

  return Response.json({
    success: true,
    data: safeUsers,
  });
}