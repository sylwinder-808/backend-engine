import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const authHeader =
      req.headers.get("authorization");

    if (!authHeader) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded: any = verifyToken(token);

    if (!decoded) {
      return Response.json({
        success: false,
        error: "Invalid token",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
      include: {
        wallet: true,
        bankAccount: true,
      },
    });

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);

    return Response.json({
      success: false,
      error: "Failed",
    });
  }
}