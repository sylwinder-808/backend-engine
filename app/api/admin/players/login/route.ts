import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let tenant = null;

    if (body.tenantCode) {
      tenant = await prisma.tenant.findUnique({
        where: {
          code: body.tenantCode,
        },
      });
    }

    if (body.domain) {
      const domain = await prisma.domain.findUnique({
        where: {
          host: body.domain,
        },
        include: {
          tenant: true,
        },
      });

      tenant = domain?.tenant ?? null;
    }

    if (!tenant) {
      return Response.json({
        success: false,
        error: "Tenant not found",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        username: body.username,
        role: "PLAYER",
      },
    });

    if (!user) {
      return Response.json({
        success: false,
        error: "Player not found",
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
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Login failed",
    });
  }
}