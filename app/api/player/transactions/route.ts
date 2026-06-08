import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    const transactions =
      await prisma.transaction.findMany({
        where: {
          userId: payload.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return Response.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}