import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (payload.role !== "SUPER_ADMIN") {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    const body = await req.json();

    const tenant = await prisma.tenant.findUnique({
      where: {
        code: body.tenantCode,
      },
    });

    if (!tenant) {
      return Response.json({
        success: false,
        error: "Invalid Credentials",
      });
    }

    const password = await bcrypt.hash(
      body.password,
      10
    );

    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        username: body.username,
        email: body.email,
        phone: body.phone ?? "-",
        password,
        role: "CLIENT_ADMIN",
      },
    });

    return Response.json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Create admin failed",
    });
  }
}