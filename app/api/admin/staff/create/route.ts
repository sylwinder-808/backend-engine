import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (payload.role !== "CLIENT_ADMIN") {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    const body = await req.json();

    const exists = await prisma.user.findFirst({
      where: {
        tenantId: payload.tenantId!,
        OR: [
          {
            username: body.username,
          },
          {
            email: body.email,
          },
        ],
      },
    });

    if (exists) {
      return Response.json({
        success: false,
        error: "User already exists",
      });
    }

    const password = await bcrypt.hash(
      body.password,
      10
    );

    const staff = await prisma.user.create({
      data: {
        tenantId: payload.tenantId!,
        username: body.username,
        email: body.email,
        phone: body.phone ?? "-",
        password,
        role: "STAFF",
      },
    });

    return Response.json({
      success: true,
      staff,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Create staff failed",
    });
  }
}