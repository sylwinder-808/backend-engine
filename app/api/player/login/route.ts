import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

function normalizeHost(value: string) {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function removePort(host: string) {
  return host.split(":")[0];
}

async function resolveTenant(req: Request, body: Record<string, unknown>) {
  const rawHost =
    req.headers.get("x-tenant-host") ||
    req.headers.get("x-public-domain") ||
    req.headers.get("x-forwarded-host") ||
    (typeof body.domain === "string" ? body.domain : "") ||
    (typeof body.host === "string" ? body.host : "") ||
    req.headers.get("host") ||
    "";

  const tenantCode =
    typeof body.tenantCode === "string" ? body.tenantCode.trim() : "";

  if (!rawHost && !tenantCode) {
    return null;
  }

  const cleanHost = rawHost ? normalizeHost(rawHost) : "";
  const hostWithoutPort = cleanHost ? removePort(cleanHost) : "";

  return prisma.domain.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        ...(cleanHost ? [{ host: cleanHost }] : []),
        ...(hostWithoutPort ? [{ host: hostWithoutPort }] : []),
        ...(tenantCode
          ? [
              {
                tenant: {
                  code: tenantCode,
                },
              },
            ]
          : []),
      ],
    },
    include: {
      tenant: true,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const domain = await resolveTenant(req, body);
    const tenant = domain?.tenant;

    if (!tenant || tenant.status !== "ACTIVE") {
      return Response.json({
        success: false,
        error: "Tenant not found",
      });
    }

    if (!body.username || !body.password) {
      return Response.json({
        success: false,
        error: "Invalid Credentials",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        username: String(body.username),
        tenantId: tenant.id,
        role: "PLAYER",
      },
      include: {
        wallet: true,
        bankAccount: true,
        tenant: true,
      },
    });

    if (!user) {
      return Response.json({
        success: false,
        error: "Player not found",
      });
    }

    const valid = await bcrypt.compare(String(body.password), user.password);

    if (!valid) {
      return Response.json({
        success: false,
        error: "Wrong password",
      });
    }

    if (user.isBlocked) {
      return Response.json({
        success: false,
        error: "Forbidden",
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
      player: {
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
        wallet: user.wallet,
        bankAccount: user.bankAccount,
        tenant: user.tenant,
      },
    });
  } catch (error) {
    console.error("PLAYER LOGIN ERROR:", error);

    return Response.json({
      success: false,
      error: "Login failed",
    });
  }
}