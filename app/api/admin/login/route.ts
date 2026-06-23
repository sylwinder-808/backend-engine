import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
      },
    });

    if (!user) {
      return Response.json({
        success: false,
        error: "User not found",
      });
    }

    if (
      user.role !== "CLIENT_ADMIN" &&
      user.role !== "STAFF"
    ) {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    const validPassword = await bcrypt.compare(
      body.password,
      user.password
    );

    if (!validPassword) {
      return Response.json({
        success: false,
        error: "Wrong password",
      });
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      tenantId: user.tenantId,
    });

    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Login failed",
    });
  }
}